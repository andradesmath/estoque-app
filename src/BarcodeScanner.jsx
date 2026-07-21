import { useEffect, useRef, useState } from 'react';

export default function BarcodeScanner({ onScan, onError, onClose }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('iniciando'); // 'iniciando', 'pronto', 'erro'
  const [errorMsg, setErrorMsg] = useState('');
  const scanDoneRef = useRef(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    let stream = null;
    let mounted = true;

    const startCamera = async () => {
      try {
        setStatus('iniciando');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 } }
        });
        const video = videoRef.current;
        if (video && mounted) {
          video.srcObject = stream;
          await video.play();
          setStatus('pronto');
          // Inicia a leitura contínua a cada 200ms
          intervalRef.current = setInterval(() => {
            if (scanDoneRef.current || !mounted) return;
            captureAndDecode(video);
          }, 200);
        }
      } catch (err) {
        console.error('Erro ao iniciar câmera:', err);
        if (mounted) {
          setStatus('erro');
          setErrorMsg(err.message || 'Falha ao acessar a câmera.');
          if (onError) onError(err);
        }
      }
    };

    const captureAndDecode = async (video) => {
      try {
        // Verifica se o navegador suporta BarcodeDetector
        if (!('BarcodeDetector' in window)) {
          if (!scanDoneRef.current) {
            setStatus('erro');
            setErrorMsg('Seu navegador não suporta leitura de código de barras. Use Chrome ou Edge.');
          }
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const detector = new BarcodeDetector({
          formats: ['qr_code', 'code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_39', 'code_93', 'itf', 'pdf417', 'aztec', 'data_matrix']
        });
        const detections = await detector.detect(imageData);
        if (detections.length > 0 && !scanDoneRef.current) {
          const code = detections[0].rawValue;
          if (code) {
            scanDoneRef.current = true;
            setStatus('pronto');
            onScan(code);
            // Para a leitura após encontrar
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
            }
          }
        }
      } catch (err) {
        console.warn('Erro na captura:', err);
      }
    };

    startCamera();

    // Cleanup
    return () => {
      mounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onScan, onError]);

  return (
    <div className="relative w-full h-full bg-black">
      <video ref={videoRef} className="w-full h-full object-cover" />
      
      {status === 'iniciando' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="text-white text-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm">Iniciando câmera...</p>
          </div>
        </div>
      )}
      
      {status === 'erro' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="text-white text-center p-4">
            <p className="text-red-400 text-sm font-semibold">⚠️ Erro na câmera</p>
            <p className="text-xs text-gray-300 mt-1">{errorMsg}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-1.5 bg-blue-600 rounded-lg text-sm hover:bg-blue-700"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Quadro de leitura */}
      <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 2px rgba(59,130,246,0.3)' }}></div>
      
      {/* Instrução */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <span className="bg-black/70 text-white text-xs font-medium py-2 px-4 rounded-full inline-block">
          📷 Aponte para o código de barras
        </span>
      </div>

      {/* Botão de fechar */}
      {onClose && (
        <button
          onClick={() => {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            onClose();
          }}
          className="absolute top-4 right-4 bg-red-500/80 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  );
}