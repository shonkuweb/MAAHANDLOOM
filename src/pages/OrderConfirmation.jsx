import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';

const OrderConfirmation = () => {
    const location = useLocation();
    const [status, setStatus] = useState('pending');
    const [orderId, setOrderId] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const statusParam = params.get('status');
        const orderIdParam = params.get('orderId');

        if (statusParam) setStatus(statusParam);
        if (orderIdParam) setOrderId(orderIdParam);
    }, [location]);

    return (
        <div className="container mx-auto px-4 py-16 text-center">
            {status === 'success' && (
                <div className="bg-green-50 p-8 rounded-lg shadow-sm inline-block">
                    <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-green-800 mb-2">Order Confirmed!</h1>
                    <p className="text-gray-600 mb-6">Thank you for your purchase. Your order <span className="font-mono font-bold">{orderId}</span> has been placed successfully.</p>
                    <Link to="/" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition">
                        Continue Shopping
                    </Link>
                </div>
            )}

            {status === 'failed' && (
                <div className="bg-red-50 p-8 rounded-lg shadow-sm inline-block">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-red-800 mb-2">Payment Failed</h1>
                    <p className="text-gray-600 mb-6">We couldn't process your payment for order <span className="font-mono font-bold">{orderId}</span>.</p>
                    <div className="space-x-4">
                        <Link to="/checkout" className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition">
                            Try Again
                        </Link>
                        <Link to="/" className="text-red-600 hover:underline">
                            Return Home
                        </Link>
                    </div>
                </div>
            )}

            {status === 'pending' && (
                <div className="bg-yellow-50 p-8 rounded-lg shadow-sm inline-block">
                    <div className="w-16 h-16 bg-yellow-100 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-yellow-800 mb-2">Payment Processing</h1>
                    <p className="text-gray-600 mb-6">We are verifying your payment for order <span className="font-mono font-bold">{orderId}</span>. This may take a few moments.</p>
                    <p className="text-sm text-gray-500 mb-6">Please do not refresh the page.</p>
                    <button onClick={() => window.location.reload()} className="bg-yellow-600 text-white px-6 py-2 rounded hover:bg-yellow-700 transition">
                        Check Status Again
                    </button>
                </div>
            )}
        </div>
    );
};

export default OrderConfirmation;
