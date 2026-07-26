// login page 
requestLogin = {
    "phone": 'number'
}
responseOtp = {
    "success": true,
    "message": "رمز یکبار مصرف ارسال شد",
    "data": {
        "phone": "number"
    }
}
badrequestNumber = {
    "success": false,
    "error": "massege"
}
requestOTP = {
    "number": 'number',
    "OTP": 'pas'
}
responseUser = {
    "success": true,
    "message": "ورود با موفقیت انجام شد",
    "data": {
        "user": {
            "id": "id",
            "name": "name",
            "email": "email",
            "phone": "phone",
            "role": "user",
            "balance": 'balance'
        },
        "token": "token"
    }
}

badrequestLogin = {
    'success': false,
    "message": "message"
}

// register Page 
requestRegister = {
    "name": 'name',
    "email": 'email', //optional
    "phone": 'number',
    "role": 'role',
}

POST /api/auth/register
RegisterColleague = {
  "name": "نام همکار",
  "email": "colleague@example.com",
  "phone": "09123456789",
  "role": "colleague",
  "documents": {
    "nationalCard": "https://example.com/files/national-card.jpg",
    "license": "https://example.com/files/license.pdf",
    "bankCard": "https://example.com/files/bank-card.jpg",
    "additionalFiles": [
      "https://example.com/files/doc1.pdf",
      "https://example.com/files/doc2.jpg"
    ]
  }
}

responeRegister = {
    "success": true,
    "message": "رمز یکبار مصرف ارسال شد",
    "data": {
        "phone": "number"
    }
}

badrequestRegister = {
    'success': false,
    "message": 'message'
}


responeRegister = {
    "success": true,
    "message": "ثبت‌ نام با موفقیت انجام شد",
    "data": {
        "user": {
            "id": "id",
            "name": "name",
            "email": "email",
            "phone": "number",
            "role": "user",
            "balance": 0
        },
        "token": "token"
    }
}

// recomendedProduct 
requestReComendedProduct = {

}

respoonseRecomendedProduct = {
    "success": true,
    "message": "محصولات با موفقیت دریافت شدند",
    "data": {
        "products": [
            {
                "id": "id",
                "name": "name",
                "description": "description",
                "price": 12000000,
                "category": "category",
                "rate": 2.5,
                "image": "image",
                "createdAt": "createAt",
                "updatedAt": "updateAt"
            },
        ]
    }
}

// recomendedVideos
requestReComendedVideo = {

}

respoonseRecomendedVideo = {
    "success": true,
    "message": "ویدئو با موفقیت دریافت شدند",
    "data": {
        "Videos": [
            {
                "id": "id",
                "name": "name",
                "description": "description",
                "time": 'time',
                "category": "category",
                "view": 100,
                "cover": "cover",
                "createdAt": "createAt",
                "updatedAt": "updateAt"
            },
        ]
    }
}

// data product
requestProduct = {
    page: 1,
    limit: 10, //productNumber in page 1 
    category: 'category',
    sort: 'sort'
}

responseProduct = {
    "success": true,
    "message": "محصولات با موفقیت دریافت شدند",
    "data": {
        "products": [
            {
                "id": "id",
                "name": "name",
                "description": "description",
                "price": 12000000,
                "category": "category",
                "rate": 2.5,
                "image": "image",
                "createdAt": "createAt",
                "updatedAt": "updateAt"
            },
            {
                "id": "id",
                "name": "name",
                "description": "description",
                "price": 12000000,
                "category": "category",
                "rate": 2.5,
                "image": "image",
                "createdAt": "createAt",
                "updatedAt": "updateAt"
            },
        ],
        "pagination": {
            "total": 100,
            "page": 1,
            "limit": 10,
            "totalPages": 10
        }
    }
}

badRequestProduct = {
    "success": false,
    "error": "message"
}

// data Videos 
requestVideos = {
    page: 1,
    limit: 10, //VideosNumber in page 1 
    category: 'category',
}

responseVideos = {
    "success": true,
    "message": "ویدئو با موفقیت دریافت شدند",
    "data": {
        "Videos": [
            {
                "id": "id",
                "name": "name",
                "description": "description",
                "time": 'time',
                "category": "category",
                "view": 100,
                "cover": "cover",
                "createdAt": "createAt",
                "updatedAt": "updateAt"
            },
        ],
        "pagination": {
            "total": 100,
            "page": 1,
            "limit": 10,
            "totalPages": 10
        }
    }
}

// transaction
requesttransaction = {
    "userId": "id",
    "products": [
        {
            "productId": "id",
            "quantity": 2,
            "price": 12000000,
            'shippingAddress': 'address send',
            "nationalityCode": 'nationalityCode',
            'phone': 'phone',
            "codePosti": 'codePosti',
            "description": 'description',
            'email': 'email'
        },
        {
            "productId": "id",
            "quantity": 2,
            "price": 25000000,
            'shippingAddress': 'address send',
            "nationalityCode": 'nationalityCode',
            'phone': 'phone',
            "codePosti": 'codePosti',
            "description": 'description',
            'email': 'email'
        }
    ],
    "totalAmount": 37000000,
    "callbackUrl": "https://your-app.com/success-pay"
}
responeTransaction = {
    "success": true,
    "message": "تراکنش با موفقیت ایجاد شد",
    "data": {
        "transactionId": "id",
        "paymentUrl": "https://payment-gateway.com/pay?token=abc123",
        "amount": 37000000,
        "createdAt": "createAt"
    }
}
badRequestTransaction = {
    "success": false,
    "error": "message"
}
// Payment Confirmation 
requestConfirmation = {
    "transactionId": "id",
    "status": "success",
    "token": "token",
    "userId": "id"
}

responseConfimation = {
    "success": true,
    "message": "پرداخت با موفقیت تأیید شد",
    "data": {
        "transactionId": "id",
        "orderId": "id",
        "amount": 37000000,
        "status": "completed",
        "completedAt": "createAt"
    }
}
badrequestConfimation = {
    "success": false,
    "error": "پرداخت ناموفق بود"
}

// Activities 
requestActivities = {

}

responseActivities = {
    "success": true,
    "message": "فعالیت‌های اخیر کاربر با موفقیت دریافت شدند",
    "data": {
        "activities": [
            {
                "id": "id",
                "type": "deposit",
                "description": "واریز به کیف پول",
                "timestamp": "time",
                "details": {
                    "amount": 5000000,
                    "method": "bank_transfer",
                    "transactionId": "id",
                    "status": "completed"
                }
            },
            {
                "id": "id",
                "type": "purchase",
                "description": "buy",
                "timestamp": "time",
                "details": {
                    "productId": "id",
                    "quantity": 1,
                    "amount": 12000000,
                    "orderId": "id",
                    "status": "completed"
                }
            },
            {
                "id": "id",
                "type": "withdrawal",
                "description": "برداشت به حساب بانکی",
                "timestamp": "time",
                "details": {
                    "amount": 3000000,
                    "bankAccount": "IR1234567890123456789012",
                    "transactionId": "id",
                    "status": "pending"
                }
            }
        ]
    }
}

badRequestActivities = {
    "success": false,
    "error": "message"
}
// deposit
requestDepsoit = {
    "userId": "id",
    "amount": 5000000,
    "callbackUrl": "https://your-app.com/wallet/deposit/callback"
}
responseDepsoit = {
    "success": true,
    "message": "تراکنش واریز با موفقیت ایجاد شد",
    "data": {
        "transactionId": "id",
        "paymentUrl": "https://payment-gateway.com/pay?token=def456",
        "amount": 5000000,
        "createdAt": "2025-10-18T18:30:00Z"
    }
}
badRequestDepsoit = {
    "success": false,
    "error": "مبلغ واریز نامعتبر است"
}

RequestConfirmationDepsoit = {
    "transactionId": 'id',
    "status": 'success',
    'tokeb': 'token'
}
responseConfirmationDepsoit = {
    "success": true,
    "message": "واریز با موفقیت تأیید شد",
    "data": {
        "transactionId": "id",
        "amount": 5000000,
        "status": "completed",
        "completedAt": "time",
        "walletBalance": 7500000
    }
}

badRequestConfimationDepsoit = {
    "success": false,
    "error": "message"
}

// withdrawal
requestwithdrawal = {
    "userId": "id",
    "amount": 3000000,
    "bankAccount": "IR1234567890123456789012"
}

responseWithdrawal = {
    "success": true,
    "message": "درخواست برداشت با موفقیت ثبت شد",
    "data": {
        "transactionId": "id",
        "amount": 3000000,
        "bankAccount": "IR1234567890123456789012",
        "status": "pending",
        "createdAt": 'time',
        "walletBalance": 4500000
    }
}
badRequestWithdrawel = {
    "success": false,
    "error": "message"
}

// orders 
requestOrders = {

}

responseOrders = {
    "success": true,
    "message": "سفارشات با موفقیت دریافت شدند",
    "data": {
        "orders": [
            {
                "id": "id",
                "userId": "id",
                "products": [
                    {
                        "productId": "id",
                        "name": "name",
                        "quantity": 1,
                        "price": 12000000
                    }
                ],
                "totalAmount": 12000000,
                "status": "completed",
                "createdAt": "createAt",
                "updatedAt": "updateAt",
                "paymentStatus": "paid",
                "shippingAddress": "address send"
            },
            {
                "id": "id",
                "userId": "id",
                "products": [
                    {
                        "productId": "id",
                        "name": "name",
                        "quantity": 1,
                        "price": 12000000
                    }
                ],
                "totalAmount": 12000000,
                "status": "completed",
                "createdAt": "createAt",
                "updatedAt": "updateAt",
                "paymentStatus": "paid",
                "shippingAddress": "address send"
            },
        ],
    }
}

badRequestOrders = {
    "success": false,
    "error": "message"
}

// Edite User 

requestEditeUser = {
    "userId": "id",
    "name": "name",
    "email": "email",
    "phone": "phone",
    "role": 'role'
}

responseEditeUser = {
    "success": true,
    "message": "اطلاعات کاربر با موفقیت به‌روزرسانی شد",
    "data": {
        "userId": "id",
        "name": "name",
        "email": "email",
        "phone": "phone",
        "updatedAt": "2025-10-18T19:19:00Z",
        "role": 'role'
    }
}

badRequestUser = {
    "success": false,
    "error": "message"
}


// manegment Product 
// add product 
requestAddProduct = {
    "name": "name",
    "description": "description",
    "price": 25000000,
    "category": "category",
    "weight": 20,
    "image": "image",
    'model': 'model' // طلای اب شده یا ساخته شده
}

responseAddProduct = {
    "success": true,
    "message": "محصول با موفقیت اضافه شد",
    "data": {
        "id": "id",
        "name": "name",
        "description": "description",
        "price": 25000000,
        "category": "category",
        "weight": 20,
        "image": "image",
        'model': 'model', // طلای اب شده یا ساخته شده
        "createdAt": "CreateAT",
        "updatedAt": "UpdateAt"
    }
}
badRequestAddProduct = {
    "success": false,
    "error": "message"
}

// edite Product 

requestEditProduct = {
    "name": "name",
    "description": "description",
    "price": 25000000,
    "category": "category",
    "weight": 20,
    "image": "image",
    'model': 'model' // طلای اب شده یا ساخته شده
}

responseEditProduct = {
    "success": true,
    "message": "محصول با موفقیت به‌روزرسانی شد",
    "data": {
        "id": "id",
        "name": "name",
        "description": "description",
        "price": 25000000,
        "category": "category",
        "weight": 20,
        "image": "image",
        'model': 'model', // طلای اب شده یا ساخته شده
        "createdAt": "CreateAT",
        "updatedAt": "UpdateAt"
    }
}
badRequestEditProduct = {
    "success": false,
    "error": "message"
}

// delete Product 
requestDeleteProduct = {
    "id": "id"
}

responsDeleteProduct = {
    "success": true,
    "message": "محصول با موفقیت حذف شد",
    "data": {
        "productId": "id"
    }
}
badRequestDeleteProduct = {
    "success": false,
    "error": "message"
}
// manegerUser
// get user  
requestGetUser = {
    "page": 1,
    "limit": 10,
    "role": 'role',
    "status": 'status'
}

responseGetUser = {
    "success": true,
    "message": "لیست کاربران با موفقیت دریافت شد",
    "data": {
        "users": [
            {
                "id": "id",
                "name": "name",
                "email": "email",
                "phone": "phone",
                "role": "role",
                "address": "adress",
                "createdAt": "CreateAt",
                "updatedAt": "updateAt"
            }
        ],
        "pagination": {
            "total": 50,
            "page": 1,
            "limit": 10,
            "totalPages": 5
        }
    }
}
badRequestGetUser = {
    "success": false,
    "error": "message"
}

// Add User 
requestAddUser = {
    "name": "name",
    "email": "email",
    "phone": "phone",
    "role": "role",
    "createdAt": "CreateAt",
    "updatedAt": "updateAt"
}

responseAddUser = {
    "success": true,
    "message": "کاربر با موفقیت اضافه شد",
    "data": {
        "id": "id",
        "name": "name",
        "email": "email",
        "phone": "phone",
        "role": "role",
        "address": "adress",
        "createdAt": "CreateAt",
        "updatedAt": "updateAt"
    }
}
badRequestAddUser = {
    "success": false,
    "error": "message"
}

// EditeUser 
requestEditeUser = {
    "id": 'id',
    "name": "name",
    "email": "email",
    "phone": "phone",
    "role": "role",
    "createdAt": "CreateAt",
    "updatedAt": "updateAt"
}

responseEditUser = {
    "success": true,
    "message": "اطلاعات کاربر با موفقیت به‌روزرسانی شد",
    "data": {
        "id": "id",
        "name": "name",
        "email": "email",
        "phone": "phone",
        "role": "role",
        "address": "adress",
        "createdAt": "CreateAt",
        "updatedAt": "updateAt"
    }
}
badRequestEditeUser = {
    "success": false,
    "error": "message"
}

// Delete User 

requestDelteUser = {
    'id': 'id'
}

responseDeleteUser = {
    "success": true,
    "message": "کاربر با موفقیت حذف شد",
    "data": {
        "userId": "id"
    }
}
badRequestDeleteeUser = {
    "success": false,
    "error": "message"
}

// maneger Videos 
// add Videos 

requestAddVideos = {
    "name": "name",
    "description": "description",
    "category": "category",
    "cover": "urlCover",
    "Video": 'urlVideos'
}

responseAddVideos = {
    "success": true,
    "message": "ویدئو با موفقیت اضاقه شد",
    "data": {
        "Videos": [
            {
                "id": "id",
                "name": "name",
                "description": "description",
                "time": 'time',
                "category": "category",
                "view": 100,
                "cover": "cover",
                "createdAt": "createAt",
                "updatedAt": "updateAt"
            },
        ],
    }
}
badRequestAddVideos = {
    "success": false,
    "error": "message"
}

// edit Videos 

requestEditVideos = {
    "name": "name",
    "description": "description",
    "category": "category",
    "cover": "urlCover",
    "Video": 'urlVideos'
}

responseEditVideos = {
    "success": true,
    "message": "ویدئو با موفقیت ویرایش شد",
    "data": {
        "Videos": [
            {
                "id": "id",
                "name": "name",
                "description": "description",
                "time": 'time',
                "category": "category",
                "view": 100,
                "cover": "cover",
                "createdAt": "createAt",
                "updatedAt": "updateAt"
            },
        ],
    }
}

badRequestٍEditVideos = {
    "success": false,
    "error": "message"
}

// Delete Videos 

requestDeleteVideos = {
    "id": 'id'
}

responseDeleteVideos = {
    "success": true,
    "message": "ویدئو با موفقیت حذف شد",
    "data": {
        "videosId": "id"
    }
}

badRequestٍDeleteVideos = {
    "success": false,
    "error": "message"
}