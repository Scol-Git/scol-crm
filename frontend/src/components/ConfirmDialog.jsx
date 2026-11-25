import Modal from './Modal';
import Button from './Button';
import Alert from './Alert';

// "Are you sure?" for destructive actions. The caller owns `busy` and `error`
// so a failed action keeps the dialog open with the server's message in it.
const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = 'Confirm',
  busyLabel = 'Working...',
  confirmVariant = 'danger',
  busy = false,
  error = '',
}) => (
  <Modal
    isOpen={isOpen}
    // Closing mid-request would hide the outcome of an action still running.
    onClose={busy ? () => {} : onClose}
    title={title}
    size="small"
    footer={(
      <>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant={confirmVariant} onClick={onConfirm} disabled={busy}>
          {busy ? busyLabel : confirmLabel}
        </Button>
      </>
    )}
  >
    <Alert variant="error">{error}</Alert>
    <div style={{ fontSize: '14px', lineHeight: 1.6 }}>{children}</div>
  </Modal>
);

export default ConfirmDialog;
