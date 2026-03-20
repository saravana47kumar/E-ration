export default function Badge({ status }) {
  const map = {
    placed: 'badge-info', confirmed: 'badge-info', processing: 'badge-warning',
    out_for_delivery: 'badge-warning', delivered: 'badge-success', cancelled: 'badge-danger',
    paid: 'badge-success', pending: 'badge-warning', failed: 'badge-danger',
    open: 'badge-info', in_progress: 'badge-warning', resolved: 'badge-success', closed: 'badge-gray',
    approved: 'badge-success', rejected: 'badge-danger',
    active: 'badge-success', inactive: 'badge-danger',
  };
  const cls = map[status] || 'badge-gray';
  return <span className={cls}>{status?.replace(/_/g, ' ')}</span>;
}
