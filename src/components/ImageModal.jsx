import { useEffect } from 'react';

const ImageModal = ({ isOpen, onClose, imageData, eggCode }) => {
  // Close modal when pressing Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Format base64 image data
  const getImageSrc = () => {
    if (!imageData) return null;
    
    // If imageData already includes data:image prefix, use as is
    if (imageData.startsWith('data:image/')) {
      return imageData;
    }
    
    // Otherwise, assume it's base64 and add the prefix
    return `data:image/jpeg;base64,${imageData}`;
  };

  const imageSrc = getImageSrc();

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              Foto Telur
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Kode: {eggCode}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <i className="fas fa-times text-gray-500 dark:text-gray-400 text-xl"></i>
          </button>
        </div>

        {/* Image Content */}
        <div className="p-6">
          {imageSrc ? (
            <div className="flex justify-center">
              <img
                src={imageSrc}
                alt={`Foto telur ${eggCode}`}
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div 
                className="hidden text-center py-12"
                style={{ display: 'none' }}
              >
                <i className="fas fa-image text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>
                <p className="text-gray-500 dark:text-gray-400">
                  Gagal memuat gambar
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <i className="fas fa-image text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>
              <p className="text-gray-500 dark:text-gray-400">
                Tidak ada foto tersedia untuk telur ini
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Tutup
          </button>
          {imageSrc && (
            <a
              href={imageSrc}
              download={`telur-${eggCode}.jpg`}
              className="px-6 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors flex items-center gap-2"
            >
              <i className="fas fa-download"></i>
              Download
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageModal; 