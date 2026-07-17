import { FormEvent, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Camera, CameraOff, QrCode, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { SkautaiPageShell } from "../components/ui/Skautai";

type BarcodeDetectorLike = {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

export function InventoryQrPage() {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const resolvingRef = useRef(false);
  const [rawValue, setRawValue] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detectorSupported = typeof window !== "undefined" && "BarcodeDetector" in window;

  useEffect(() => () => stopCamera(), []);

  async function resolve(value: string) {
    if (!auth?.token || !auth.activeTuntasId || resolvingRef.current) return;
    const token = parseQrToken(value);
    if (!token) { setError("QR reikšmė neatpažinta. Naudokite „skautai://scan/...“ kodą arba patį žetoną."); return; }
    resolvingRef.current = true; setIsResolving(true); setError(null);
    try { const result = await api.resolveItemQr(auth.token, auth.activeTuntasId, token); stopCamera(); navigate(`/inventory/${result.itemId}`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Inventoriaus pagal šį QR kodą rasti nepavyko."); }
    finally { resolvingRef.current = false; setIsResolving(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void resolve(rawValue); }

  async function startCamera() {
    if (!detectorSupported || isCameraActive) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      if (!videoRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsCameraActive(true);
      const Detector = (window as typeof window & { BarcodeDetector: BarcodeDetectorConstructor }).BarcodeDetector;
      const detector = new Detector({ formats: ["qr_code"] });
      const scan = async () => {
        const video = videoRef.current;
        if (!video || !streamRef.current) return;
        try {
          const codes = await detector.detect(video);
          const value = codes[0]?.rawValue;
          if (value) { setRawValue(value); await resolve(value); return; }
        } catch {
          // Some browsers throw while the camera is warming up; the next frame retries.
        }
        frameRef.current = window.requestAnimationFrame(() => void scan());
      };
      frameRef.current = window.requestAnimationFrame(() => void scan());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Kamerai suteikti prieigos nepavyko.");
      stopCamera();
    }
  }

  function stopCamera() {
    if (frameRef.current != null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraActive(false);
  }

  return <SkautaiPageShell className="inventory-qr-page" eyebrow="Inventorius" title="QR kodo paieška" description="Nuskenuokite tą patį inventoriaus QR kodą, kuris naudojamas Android programėlėje, arba įklijuokite jo reikšmę." width="standard">
    <Link className="back-link" to="/inventory"><ArrowLeft size={17} />Grįžti į inventorių</Link>
    {error && <div className="inline-alert"><AlertCircle size={18} /><span>{error}</span></div>}
    <section className="qr-scanner-panel">
      <div className={`qr-video-frame${isCameraActive ? " is-active" : ""}`}><video ref={videoRef} muted playsInline /><div className="qr-focus-frame" aria-hidden="true" />{!isCameraActive && <div className="qr-camera-placeholder"><QrCode size={46} /><strong>{detectorSupported ? "Kamera neįjungta" : "Kameros QR atpažinimas šiame naršyklėje nepalaikomas"}</strong><span>Rankinis žetono įvedimas veikia visose naršyklėse.</span></div>}</div>
      {detectorSupported && <button className="secondary-button" type="button" onClick={isCameraActive ? stopCamera : () => void startCamera()}>{isCameraActive ? <CameraOff size={17} /> : <Camera size={17} />}{isCameraActive ? "Išjungti kamerą" : "Skenuoti kamera"}</button>}
      <form className="qr-token-form" onSubmit={submit}><label className="form-field"><span>QR reikšmė arba žetonas</span><input value={rawValue} onChange={(event) => setRawValue(event.target.value)} placeholder="skautai://scan/..." autoComplete="off" /></label><button className="primary-button" type="submit" disabled={isResolving || !rawValue.trim()}><Search size={17} />{isResolving ? "Ieškoma..." : "Atverti inventorių"}</button></form>
    </section>
  </SkautaiPageShell>;
}

function parseQrToken(raw: string) {
  const value = raw.trim();
  if (!value) return null;
  if (/^[A-Za-z0-9][A-Za-z0-9._-]{7,127}$/.test(value) && value.includes("-")) return value;
  try { const url = new URL(value); if (url.protocol === "skautai:" && url.hostname === "scan") return url.pathname.split("/").filter(Boolean)[0] ?? null; }
  catch { return null; }
  return null;
}
