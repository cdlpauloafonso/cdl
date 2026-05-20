'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

type CredentialingQrScannerModalProps = {
  open: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
};

export function CredentialingQrScannerModal({ open, onClose, onScan }: CredentialingQrScannerModalProps) {
  const regionId = useId().replace(/:/g, '');
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const handledRef = useRef(false);
  const [cameraError, setCameraError] = useState('');

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      await scanner.stop();
    } catch {
      /* já parado */
    }
  }, []);

  useEffect(() => {
    if (!open) {
      handledRef.current = false;
      setCameraError('');
      void stopScanner();
      return;
    }

    let cancelled = false;
    handledRef.current = false;

    async function start() {
      setCameraError('');
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;

        const scanner = new Html5Qrcode(regionId, { verbose: false });
        scannerRef.current = scanner;

        const cameras = await Html5Qrcode.getCameras();
        if (cancelled) return;

        const backCamera =
          cameras.find((c) => /back|rear|traseira|environment/i.test(c.label)) ?? cameras[cameras.length - 1];
        const cameraIdOrConfig = backCamera?.id ?? { facingMode: 'environment' as const };

        await scanner.start(
          cameraIdOrConfig,
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.72;
              return { width: size, height: size };
            },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (handledRef.current) return;
            handledRef.current = true;
            void navigator.vibrate?.(120);
            onScan(decodedText);
            void stopScanner();
            onClose();
          },
          () => {
            /* leitura em andamento */
          },
        );
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : '';
        if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')) {
          setCameraError(
            'Permissão da câmera negada. Autorize o acesso à câmera nas configurações do navegador e tente novamente.',
          );
        } else if (msg.toLowerCase().includes('notfound')) {
          setCameraError('Nenhuma câmera encontrada neste dispositivo.');
        } else {
          setCameraError('Não foi possível abrir a câmera. Use HTTPS ou tente outro navegador.');
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [open, onClose, onScan, regionId, stopScanner]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-title"
    >
      <div className="flex items-center justify-between gap-3 bg-gray-900 px-4 py-3 text-white safe-area-inset-top">
        <div className="min-w-0">
          <h2 id="qr-scanner-title" className="text-base font-semibold">
            Ler QR Code
          </h2>
          <p className="text-xs text-gray-300">Aponte para o QR Code do participante</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void stopScanner();
            onClose();
          }}
          className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20"
        >
          Fechar
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center p-4">
        {cameraError ? (
          <div className="max-w-sm rounded-xl border border-amber-300/40 bg-amber-950/80 px-4 py-4 text-center text-sm text-amber-100">
            {cameraError}
          </div>
        ) : (
          <>
            <div
              id={regionId}
              className="w-full max-w-md overflow-hidden rounded-2xl border-2 border-white/20 bg-black [&_video]:!rounded-2xl"
            />
            <p className="mt-4 max-w-sm text-center text-sm text-gray-300">
              O credenciamento será feito automaticamente ao reconhecer um QR Code válido deste evento.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
