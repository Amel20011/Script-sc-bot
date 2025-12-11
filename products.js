// Database produk (bisa diganti dengan database sesungguhnya)
const products = {
    "PRD001": {
        id: "PRD001",
        name: "Sepatu Sneakers",
        price: 250000,
        description: "Sepatu sneakers pria/wanita, bahan kulit sintetis, nyaman dipakai sehari-hari.",
        category: "Fashion",
        stock: 10,
        image: "https://example.com/shoes.jpg"
    },
    "PRD002": {
        id: "PRD002",
        name: "T-Shirt Basic",
        price: 85000,
        description: "Kaos basic cotton combed 30s, bahan adem, tidak melar.",
        category: "Fashion",
        stock: 25,
        image: "https://example.com/tshirt.jpg"
    },
    "PRD003": {
        id: "PRD003",
        name: "Smartphone XYZ",
        price: 3200000,
        description: "Smartphone dengan kamera 48MP, RAM 8GB, storage 128GB.",
        category: "Elektronik",
        stock: 5,
        image: "https://example.com/phone.jpg"
    },
    "PRD004": {
        id: "PRD004",
        name: "Buku Programming",
        price: 120000,
        description: "Buku belajar JavaScript untuk pemula hingga mahir.",
        category: "Buku",
        stock: 15,
        image: "https://example.com/book.jpg"
    }
};

// Kategori produk
const categories = [
    { id: "all", name: "Semua Produk" },
    { id: "fashion", name: "Fashion" },
    { id: "elektronik", name: "Elektronik" },
    { id: "buku", name: "Buku" }
];

// Fungsi untuk mendapatkan produk
function getProducts(category = "all") {
    if (category === "all") {
        return Object.values(products);
    }
    return Object.values(products).filter(p => p.category.toLowerCase() === category.toLowerCase());
}

function getProductById(id) {
    return products[id];
}

function updateStock(productId, quantity) {
    if (products[productId] && products[productId].stock >= quantity) {
        products[productId].stock -= quantity;
        return true;
    }
    return false;
}

module.exports = {
    products,
    categories,
    getProducts,
    getProductById,
    updateStock
};
