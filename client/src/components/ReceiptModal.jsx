import { useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { FiDownload, FiX } from 'react-icons/fi';
import Modal from './Modal';

export default function ReceiptModal({ isOpen, onClose, order }) {
  const receiptRef = useRef();

  const downloadPDF = () => {
    const doc = new jsPDF();
    const date = new Date(order.createdAt).toLocaleString();
    
    doc.setFontSize(20);
    doc.text('E-Ration System', 105, 20, { align: 'center' });
    doc.setFontSize(16);
    doc.text('Digital Receipt', 105, 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Order ID: ${order._id.slice(-10).toUpperCase()}`, 14, 45);
    doc.text(`Date: ${date}`, 14, 52);
    doc.text(`Payment Method: ${order.paymentMethod?.toUpperCase()}`, 14, 59);
    doc.text(`Payment Status: ${order.paymentStatus}`, 14, 66);
    
    doc.text(`Customer: ${order.customer?.name}`, 14, 76);
    doc.text(`Phone: ${order.customer?.phone}`, 14, 83);
    doc.text(`Ration Card: ${order.rationCardNumber || '—'}`, 14, 90);
    
    const tableData = order.items.map(item => [
      item.name,
      item.quantity,
      item.unit,
      `₹${item.price}`,
      `₹${(item.price * item.quantity).toFixed(2)}`
    ]);
    
    doc.autoTable({
      startY: 100,
      head: [['Item', 'Qty', 'Unit', 'Price', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [252, 128, 25] },
    });
    
    const finalY = doc.lastAutoTable.finalY || 120;
    doc.setFontSize(12);
    doc.text(`Total Amount: ₹${order.totalAmount.toFixed(2)}`, 140, finalY + 10);
    doc.text('Thank you for shopping with E-Ration!', 105, finalY + 25, { align: 'center' });
    
    doc.save(`receipt_${order._id.slice(-8)}.pdf`);
  };

  if (!order) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Digital Receipt" size="lg">
      <div ref={receiptRef} className="space-y-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🌾</div>
            <h2 className="text-xl font-bold text-gray-900">E-Ration System</h2>
            <p className="text-xs text-gray-500">Government Public Distribution System</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm mb-4 pb-4 border-b">
            <div><span className="text-gray-500">Order ID:</span> <span className="font-mono">{order._id.slice(-10).toUpperCase()}</span></div>
            <div><span className="text-gray-500">Date:</span> {new Date(order.createdAt).toLocaleString()}</div>
            <div><span className="text-gray-500">Payment:</span> <span className="capitalize">{order.paymentMethod}</span></div>
            <div><span className="text-gray-500">Status:</span> <span className="capitalize">{order.paymentStatus}</span></div>
          </div>
          
          <div className="mb-4 pb-4 border-b">
            <p className="font-semibold text-gray-900 mb-2">Customer Details</p>
            <p className="text-sm">{order.customer?.name}</p>
            <p className="text-sm text-gray-500">{order.customer?.phone}</p>
            <p className="text-sm text-gray-500">{order.deliveryAddress}</p>
          </div>
          
          <div className="mb-4">
            <p className="font-semibold text-gray-900 mb-2">Items</p>
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{item.name} × {item.quantity} {item.unit}</span>
                  <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3 pt-3 border-t font-bold">
              <span>Total</span>
              <span className="text-orange-600">₹{order.totalAmount.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="text-center text-xs text-gray-400 pt-4 border-t">
            Thank you for using E-Ration System
          </div>
        </div>
        
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Close</button>
          <button onClick={downloadPDF} className="btn-primary flex items-center gap-2">
            <FiDownload /> Download PDF
          </button>
        </div>
      </div>
    </Modal>
  );
}