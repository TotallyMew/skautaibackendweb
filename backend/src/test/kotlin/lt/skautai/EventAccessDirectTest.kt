package lt.skautai

import io.ktor.server.testing.testApplication
import kotlinx.datetime.Clock
import lt.skautai.TestHelper.configureFullApp
import lt.skautai.TestHelper.createUnit
import lt.skautai.TestHelper.getRoleId
import lt.skautai.TestHelper.randomEmail
import lt.skautai.TestHelper.registerAndActivateTuntininkas
import lt.skautai.TestHelper.registerInvitedUser
import lt.skautai.database.tables.EventRoles
import lt.skautai.database.tables.Pastovykles
import lt.skautai.database.tables.Roles
import lt.skautai.database.tables.UserRanks
import lt.skautai.database.tables.Users
import lt.skautai.models.requests.AssignPastovykleLeaderRequest
import lt.skautai.models.requests.AssignEventRoleRequest
import lt.skautai.models.requests.CreateEventRequest
import lt.skautai.models.requests.CreateEventInventoryItemRequest
import lt.skautai.models.requests.CreateEventInventoryMovementRequest
import lt.skautai.models.requests.CreatePastovykleRequest
import lt.skautai.models.requests.UpdateEventRequest
import lt.skautai.models.requests.UpdateEventPackingLineRequest
import lt.skautai.services.EventPackingService
import lt.skautai.services.EventService
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import java.util.UUID
import java.time.LocalDate
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class EventAccessDirectTest {

    private val service = EventService()

    @BeforeAll
    fun setup() {
        TestHelper.setupDatabase()
    }

    @AfterAll
    fun teardown() {
        TestHelper.teardownDatabase()
    }

    @BeforeEach
    fun cleanTables() {
        TestHelper.cleanTables()
    }

    private fun userIdByEmail(email: String): UUID = transaction {
        Users.selectAll()
            .where { Users.email eq email }
            .first()[Users.id]
    }

    private fun insertRank(userId: UUID, tuntasId: UUID, roleName: String, assignedBy: UUID) {
        transaction {
            val roleId = Roles.selectAll()
                .where { (Roles.tuntasId eq tuntasId) and (Roles.name eq roleName) }
                .first()[Roles.id]
            UserRanks.deleteWhere { (UserRanks.userId eq userId) and (UserRanks.tuntasId eq tuntasId) }
            UserRanks.insert {
                it[this.userId] = userId
                it[this.roleId] = roleId
                it[this.tuntasId] = tuntasId
                it[assignedByUserId] = assignedBy
                it[assignedAt] = Clock.System.now()
            }
        }
    }

    @Test
    fun `event service evaluates create permissions and visible events by rank and unit`() = testApplication {
        configureFullApp()
        val ownerEmail = "event-owner@test.com"
        val (token, tuntasIdText) = client.registerAndActivateTuntininkas(email = ownerEmail)
        val tuntasId = UUID.fromString(tuntasIdText)
        val ownerId = userIdByEmail(ownerEmail)

        val gildijaId = createUnit(token, tuntasIdText, "Gildija", "GILDIJA")
        val seniorUnitId = createUnit(token, tuntasIdText, "Vyrs", "VYR_SKAUTU_VIENETAS")

        val vadovasEmail = randomEmail("vadovas")
        val seniorEmail = randomEmail("senior")
        val (_, vadovasIdText) = client.registerInvitedUser(token, tuntasIdText, "Vadovas", vadovasEmail, gildijaId)
        val (_, seniorIdText) = client.registerInvitedUser(token, tuntasIdText, "Vyr. skautas", seniorEmail, seniorUnitId)
        val vadovasId = UUID.fromString(vadovasIdText)
        val seniorId = UUID.fromString(seniorIdText)

        insertRank(vadovasId, tuntasId, "Vadovas", ownerId)
        insertRank(seniorId, tuntasId, "Patyres skautas", ownerId)

        assertFalse(service.canCreateEvent(UUID.randomUUID(), tuntasId, null))
        assertTrue(service.canCreateEvent(vadovasId, tuntasId, null))
        assertTrue(service.canCreateEvent(vadovasId, tuntasId, UUID.fromString(gildijaId)))
        assertTrue(service.canCreateEvent(seniorId, tuntasId, UUID.fromString(seniorUnitId)))
        assertFalse(service.canCreateEvent(seniorId, tuntasId, UUID.fromString(gildijaId)))

        service.createEvent(
            tuntasId = tuntasId,
            createdByUserId = ownerId,
            request = CreateEventRequest(
                name = "Bendras renginys",
                type = "STOVYKLA",
                startDate = "2026-07-01",
                endDate = "2026-07-05"
            )
        ).getOrThrow()

        service.createEvent(
            tuntasId = tuntasId,
            createdByUserId = ownerId,
            request = CreateEventRequest(
                name = "Gildijos renginys",
                type = "SUEIGA",
                startDate = "2026-08-01",
                endDate = "2026-08-02",
                organizationalUnitId = gildijaId
            )
        ).getOrThrow()

        service.createEvent(
            tuntasId = tuntasId,
            createdByUserId = ownerId,
            request = CreateEventRequest(
                name = "Senioru renginys",
                type = "RENGINYS",
                startDate = "2026-09-01",
                endDate = "2026-09-02",
                organizationalUnitId = seniorUnitId
            )
        ).getOrThrow()

        val vadovasVisible = service.getVisibleEvents(tuntasId, vadovasId).getOrThrow()
        val seniorVisible = service.getVisibleEvents(tuntasId, seniorId).getOrThrow()

        assertEquals(setOf("Bendras renginys", "Gildijos renginys"), vadovasVisible.events.map { it.name }.toSet())
        assertEquals(setOf("Senioru renginys"), seniorVisible.events.map { it.name }.toSet())
    }

    @Test
    fun `event service validates pastovyklės creation leader assignment and responsible visibility`() = testApplication {
        configureFullApp()
        val ownerEmail = "pastovykle-owner@test.com"
        val memberEmail = randomEmail("pastovykle-member")
        val outsiderEmail = "outsider@test.com"
        val (token, tuntasIdText) = client.registerAndActivateTuntininkas(email = ownerEmail)
        val (_, otherTuntasIdText) = client.registerAndActivateTuntininkas(email = outsiderEmail, tuntasName = "Kita stovykla")
        val tuntasId = UUID.fromString(tuntasIdText)
        val ownerId = userIdByEmail(ownerEmail)
        val outsiderId = userIdByEmail(outsiderEmail)
        val (_, memberIdText) = client.registerInvitedUser(token, tuntasIdText, "Skautas", memberEmail)
        val memberId = UUID.fromString(memberIdText)

        val event = service.createEvent(
            tuntasId = tuntasId,
            createdByUserId = ownerId,
            request = CreateEventRequest(
                name = "Stovykla",
                type = "STOVYKLA",
                startDate = "2026-07-01",
                endDate = "2026-07-07"
            )
        ).getOrThrow()
        val eventId = UUID.fromString(event.id)

        val invalidAgeGroup = service.createPastovykle(
            eventId = eventId,
            tuntasId = tuntasId,
            request = CreatePastovykleRequest(name = "Vilkai", ageGroup = "BLOGAS")
        )
        assertTrue(invalidAgeGroup.isFailure)

        val outsiderResponsible = service.createPastovykle(
            eventId = eventId,
            tuntasId = tuntasId,
            request = CreatePastovykleRequest(name = "Skautai", responsibleUserId = outsiderId.toString())
        )
        assertEquals("Responsible user must be a member of this tuntas", outsiderResponsible.exceptionOrNull()?.message)

        val pastovykle = service.createPastovykle(
            eventId = eventId,
            tuntasId = tuntasId,
            request = CreatePastovykleRequest(name = "Pirma", responsibleUserId = memberId.toString(), ageGroup = "SKAUTAI")
        ).getOrThrow()
        val pastovykleId = UUID.fromString(pastovykle.id)

        val sameResponsibleAsLeader = service.assignPastovykleLeader(
            eventId = eventId,
            pastovykleId = pastovykleId,
            tuntasId = tuntasId,
            assignedByUserId = ownerId,
            request = AssignPastovykleLeaderRequest(userId = memberId.toString())
        )
        assertEquals(
            "Pagrindinis vadovas jau turi pastovyklės vadovo teises",
            sameResponsibleAsLeader.exceptionOrNull()?.message
        )

        val anotherEmail = randomEmail("pastovykle-leader")
        val (_, anotherIdText) = client.registerInvitedUser(token, tuntasIdText, "Skautas", anotherEmail)
        val anotherId = UUID.fromString(anotherIdText)

        val assigned = service.assignPastovykleLeader(
            eventId = eventId,
            pastovykleId = pastovykleId,
            tuntasId = tuntasId,
            assignedByUserId = ownerId,
            request = AssignPastovykleLeaderRequest(userId = anotherId.toString())
        )
        assertTrue(assigned.isSuccess)
        assertEquals("PASTOVYKLES_GURU", assigned.getOrThrow().role)

        val responsibleEvents = service.getResponsibleEvents(tuntasId, memberId).getOrThrow()
        assertEquals(listOf("Stovykla"), responsibleEvents.events.map { it.name })

        val roleRows = transaction {
            EventRoles.selectAll()
                .where { EventRoles.eventId eq eventId }
                .count()
        }
        val pastovykleRows = transaction {
            Pastovykles.selectAll()
                .where { Pastovykles.id eq pastovykleId }
                .count()
        }
        assertTrue(roleRows >= 2)
        assertEquals(1, pastovykleRows)
        assertTrue(otherTuntasIdText.isNotBlank())
    }

    @Test
    fun `event capabilities expose only event type and role appropriate workspaces`() = testApplication {
        configureFullApp()
        val ownerEmail = "event-capabilities-owner@test.com"
        val financeEmail = randomEmail("event-finance")
        val (token, tuntasIdText) = client.registerAndActivateTuntininkas(email = ownerEmail)
        val tuntasId = UUID.fromString(tuntasIdText)
        val ownerId = userIdByEmail(ownerEmail)
        val (_, financeIdText) = client.registerInvitedUser(token, tuntasIdText, "Finansininkas", financeEmail)
        val financeId = UUID.fromString(financeIdText)

        val event = service.createEvent(
            tuntasId = tuntasId,
            createdByUserId = ownerId,
            request = CreateEventRequest(
                name = "Ne stovykla",
                type = "RENGINYS",
                startDate = "2026-08-01",
                endDate = "2026-08-02",
                notes = "Bus pašalinta"
            )
        ).getOrThrow()
        val eventId = UUID.fromString(event.id)
        service.assignEventRole(
            eventId = eventId,
            tuntasId = tuntasId,
            assignedByUserId = ownerId,
            request = AssignEventRoleRequest(userId = financeIdText, role = "FINANSININKAS")
        ).getOrThrow()

        val ownerCapabilities = service.getEvent(eventId, tuntasId, ownerId).getOrThrow().capabilities!!
        assertFalse(ownerCapabilities.canViewPastovykles)
        assertTrue(ownerCapabilities.canViewReconciliation)

        val financeCapabilities = service.getEvent(eventId, tuntasId, financeId).getOrThrow().capabilities!!
        assertTrue(financeCapabilities.canViewPlan)
        assertTrue(financeCapabilities.canManagePurchases)
        assertFalse(financeCapabilities.canViewInventory)
        assertFalse(financeCapabilities.canViewPastovykles)
        assertFalse(financeCapabilities.canViewReconciliation)
        assertTrue(service.canViewEventPlan(eventId, tuntasId, financeId))

        val cleared = service.updateEvent(eventId, tuntasId, UpdateEventRequest(clearNotes = true)).getOrThrow()
        assertEquals(null, cleared.notes)
    }

    @Test
    fun `event movement rejects ordinary members but recognizes pastovykle co-leaders`() = testApplication {
        configureFullApp()
        val ownerEmail = "event-movement-owner@test.com"
        val memberEmail = randomEmail("event-movement-member")
        val (token, tuntasIdText) = client.registerAndActivateTuntininkas(email = ownerEmail)
        val tuntasId = UUID.fromString(tuntasIdText)
        val ownerId = userIdByEmail(ownerEmail)
        val (_, memberIdText) = client.registerInvitedUser(token, tuntasIdText, "Skautas", memberEmail)
        val memberId = UUID.fromString(memberIdText)
        val today = LocalDate.now()

        val event = service.createEvent(
            tuntasId = tuntasId,
            createdByUserId = ownerId,
            request = CreateEventRequest(
                name = "Aktyvi stovykla",
                type = "STOVYKLA",
                startDate = today.minusDays(1).toString(),
                endDate = today.plusDays(1).toString()
            )
        ).getOrThrow()
        val eventId = UUID.fromString(event.id)
        service.updateEvent(eventId, tuntasId, UpdateEventRequest(status = "ACTIVE")).getOrThrow()
        val planItem = service.createInventoryItem(
            eventId,
            tuntasId,
            ownerId,
            CreateEventInventoryItemRequest(name = "Virvė", plannedQuantity = 1)
        ).getOrThrow()

        val ordinaryCheckout = service.createInventoryMovement(
            eventId,
            tuntasId,
            memberId,
            CreateEventInventoryMovementRequest(
                eventInventoryItemId = planItem.id,
                movementType = "CHECKOUT_TO_PERSON",
                quantity = 1
            ),
            canManageInventory = false
        )
        assertEquals(
            "Pastovyklės vadovas gali išduoti tik savo pastovyklės inventorių",
            ordinaryCheckout.exceptionOrNull()?.message
        )

        val pastovykle = service.createPastovykle(eventId, tuntasId, CreatePastovykleRequest(name = "Aitvarai")).getOrThrow()
        service.assignPastovykleLeader(
            eventId,
            UUID.fromString(pastovykle.id),
            tuntasId,
            ownerId,
            AssignPastovykleLeaderRequest(userId = memberIdText)
        ).getOrThrow()
        val coLeaderCheckout = service.createInventoryMovement(
            eventId,
            tuntasId,
            memberId,
            CreateEventInventoryMovementRequest(
                eventInventoryItemId = planItem.id,
                movementType = "CHECKOUT_TO_PERSON",
                quantity = 1,
                pastovykleId = pastovykle.id
            ),
            canManageInventory = false
        )
        assertEquals("Not enough quantity to checkout. Available: 0", coLeaderCheckout.exceptionOrNull()?.message)
    }

    @Test
    fun `packing mutations reject cancelled events`() = testApplication {
        configureFullApp()
        val ownerEmail = "event-packing-owner@test.com"
        val (_, tuntasIdText) = client.registerAndActivateTuntininkas(email = ownerEmail)
        val tuntasId = UUID.fromString(tuntasIdText)
        val ownerId = userIdByEmail(ownerEmail)
        val event = service.createEvent(
            tuntasId,
            ownerId,
            CreateEventRequest("Atšaukta stovykla", "STOVYKLA", startDate = "2026-08-01", endDate = "2026-08-02")
        ).getOrThrow()
        val eventId = UUID.fromString(event.id)
        val planItem = service.createInventoryItem(
            eventId,
            tuntasId,
            ownerId,
            CreateEventInventoryItemRequest(name = "Dėžė", plannedQuantity = 1)
        ).getOrThrow()
        val packingService = EventPackingService()
        val packing = packingService.generateFromPlan(eventId, tuntasId).getOrThrow()
        val invalidSkip = packingService.updateLine(
            eventId,
            UUID.fromString(packing.lines.single { it.eventInventoryItemId == planItem.id }.id),
            tuntasId,
            ownerId,
            UpdateEventPackingLineRequest(status = "PACKED")
        )
        assertEquals("Invalid packing status transition: TODO -> PACKED", invalidSkip.exceptionOrNull()?.message)
        service.deleteEvent(eventId, tuntasId).getOrThrow()

        val result = packingService.generateFromPlan(eventId, tuntasId)
        assertEquals("Completed or cancelled events are read-only", result.exceptionOrNull()?.message)
    }
}
