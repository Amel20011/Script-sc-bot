// Database pesanan sementara
let orders = {};
let orderCounter = 1;

// Fungsi untuk membuat pesanan baru
function createOrder(userId, items, total) {
    const orderId = `ORD${String(orderCounter).padStart(4, '0')}`;
    const order = {
        id: orderId,
        userId: userId,
        items: items,
        total: total,
        status: "pending", // pending, processing, shipped, completed, cancelled
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (!orders[userId]) {
        orders[userId] = [];
    }
    
    orders[userId].push(order);
    orderCounter++;
    
    return order;
}

// Fungsi untuk mendapatkan pesanan user
function getUserOrders(userId) {
    return orders[userId] || [];
}

// Fungsi untuk mendapatkan detail pesanan
function getOrderDetail(userId, orderId) {
    if (!orders[userId]) return null;
    return orders[userId].find(order => order.id === orderId);
}

// Fungsi untuk update status pesanan
function updateOrderStatus(userId, orderId, status) {
    const order = getOrderDetail(userId, orderId);
    if (order) {
        order.status = status;
        order.updatedAt = new Date().toISOString();
        return true;
    }
    return false;
}

module.exports = {
    createOrder,
    getUserOrders,
    getOrderDetail,
    updateOrderStatus
};
