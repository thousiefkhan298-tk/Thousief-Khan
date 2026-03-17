import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  url: string;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ url }) => {
  const [src, setSrc] = useState('');

  useEffect(() => {
    QRCode.toDataURL(url, { width: 256, margin: 2 }).then(setSrc);
  }, [url]);

  return <img src={src} alt="Download App QR Code" className="w-32 h-32 rounded-xl" />;
};

export default QRCodeDisplay;
