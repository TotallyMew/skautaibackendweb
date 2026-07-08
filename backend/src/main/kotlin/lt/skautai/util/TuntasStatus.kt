package lt.skautai.util

fun isSelectableTuntasStatus(status: String): Boolean =
    status == "ACTIVE" || status == "APPROVED"

fun normalizeSelectableTuntasStatus(status: String): String =
    if (isSelectableTuntasStatus(status)) "ACTIVE" else status
