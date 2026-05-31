import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Modal } from './Modal';

export const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, loading }) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-red-100">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
        </div>
        <p className="text-sm text-slate-600 mt-2">{message}</p>
      </div>
      <div className="flex justify-end gap-3 mt-2">
        <button className="btn-secondary" onClick={onClose} disabled={loading}>
          Cancel
        </button>
        <button className="btn-danger" onClick={onConfirm} disabled={loading}>
          {loading ? 'Processing...' : 'Confirm'}
        </button>
      </div>
    </div>
  </Modal>
);
