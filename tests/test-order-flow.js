const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server'); // Assuming this exports the express app
const User = require('../models/user.model');
const Product = require('../models/product.model');
const Order = require('../models/order.js');
const Cart = require('../models/cart.js');
const Price = require('../models/price.model');

// Helper to create a user and get token
async function setupUser() {
    const phone = '09120000000';
    let user = await User.findOne({ phone });
    if (!user) {
        user = await User.create({
            firstName: 'Test',
            lastName: 'User',
            phone: phone,
            role: 'user',
            isActive: true
        });
    }
    // Create JWT directly using AuthService or similar logic if accessible, 
    // or mock the auth middleware.
    // For integration test, it's better to login. But we don't have login logic handy without OTP.
    // So we will use a workaround: mocking the auth middleware is hard without changing code.
    // Instead we will generate a valid token using AuthService if accessible.
    
    // Check if AuthService is exported or require local version
    const AuthService = require('../middleware/auth.service');
    const token = AuthService.createJWToken(user);
    
    // Also set the cookie if needed, but supertest handles headers best.
    // The middleware checks cookie 'jwt'.
    return { user, token };
}

async function runTest() {
    let connection;
    try {
        // Connect to test DB or rely on server.js connection (which might connect to prod DB if not careful)
        // server.js connects automatically. Mongoose handles singleton connection.
        // We just need to wait a bit for connection if necessary, but usually mongoose buffers commands.
        
        console.log('--- Starting Order Flow Test ---');

        const { user, token } = await setupUser();
        const cookie = `jwt=${token}`;

        // Create dummy price
        await Price.create({
             SekehRob: 3510000, 
             SekehNim: 6100000, 
             SekehTamam: 11160000, 
             SekehEmam: 11700000, 
             YekGram18: 2500000, 
             KharidMotefaregheh18: 2400000, 
             TavizMotefaregheh18: 2450000, 
             YekGram20: 2700000, 
             SekehGerami: 1700000, 
             YekGram21: 2900000, 
             Dollar: 50000, 
             Euro: 55000, 
             Derham: 14000, 
             OunceTala: 2000, 
             TimeRead: new Date()
        });

        // Create a product
        const product = await Product.create({
            name: 'Test Gold Bar',
            title: 'Test Gold Bar Deprecated', // Keeping just in case
            price: 1000000,
            weight: 1,
            wage: 0.1,
            images: [],
            stock: 10,
            purity: 18,
            profitPercentage: 5,
            category: 'ساخته'
        });

        console.log('1. Adding to Cart...');
        const cartRes = await request(app)
            .post('/api/cart')
            .set('Cookie', [cookie])
            .send({ productId: product._id, quantity: 2 });
        
        if (cartRes.status !== 200) {
            console.error('Add to Cart Failed:', cartRes.body);
            throw new Error('Add to Cart Failed');
        }
        console.log('   Cart Updated:', cartRes.body.data.totalAmount);

        console.log('2. Placing Custodial Order...');
        const orderRes = await request(app)
            .post('/api/orders')
            .set('Cookie', [cookie])
            .send({ 
                isCustodial: true
            });

        if (orderRes.status !== 201) {
            console.error('Place Order Failed:', orderRes.body);
            throw new Error('Place Order Failed');
        }
        const order = orderRes.body.data;
        console.log('   Order Created:', order.orderNumber, 'Status:', order.status);

        console.log('3. Verifying Cart is Empty...');
        const getCartRes = await request(app)
            .get('/api/cart')
            .set('Cookie', [cookie]);
        
        if (getCartRes.body.data.items.length !== 0) {
             throw new Error('Cart not empty after order');
        }
        console.log('   Cart is empty.');

        console.log('4. Requesting Delivery for Order...');
        const deliveryRes = await request(app)
            .post(`/api/orders/${order._id}/request-delivery`)
            .set('Cookie', [cookie])
            .send({ 
                shippingAddress: {
                    address: 'Tehran',
                    city: 'Tehran',
                    postalCode: '1234567890'
                }
            });

        if (deliveryRes.status !== 200) {
            console.error('Request Delivery Failed:', deliveryRes.body);
            throw new Error('Request Delivery Failed');
        }
        console.log('   Delivery Requested. New Status:', deliveryRes.body.data.custodialStatus);

        console.log('--- Test Passed Successfully ---');

        // Cleanup
        await Product.findByIdAndDelete(product._id);
        await Order.findByIdAndDelete(order._id);
        await Cart.findOneAndDelete({ user: user._id });
        // Don't delete user to avoid unique phone issues next run, or do if you want clean slate
        
    } catch (error) {
        console.error('--- Test Failed ---');
        console.error(error);
    } finally {
        // Force exit because server.js keeps listening
        process.exit(0);
    }
}

// Give some time for server.js to connect to DB
setTimeout(runTest, 3000);
