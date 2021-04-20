const { ordered } = require('joi/lib/types/array');

const 
    express = require('express'),
    router = express.Router(),
    config = require('config'),
    auth = require('../../middleware/auth'),
    {Item} = require('../../models/item'),
    { User } = require('../../models/user'),
    {OrderItem, validatePSEpayment, validateCashPayment, validateCardPayment} = require('../../models/orderItem'),
    {validateCreditCard} = require('../../models/creditCard'),
    payGW = require('../../services/epayco');

const getBanks = async (req, res) => {
    return res.send(await payGW.listBanks())
}

const getCashEntities = async (req, res) => {
    return res.send(payGW.listCashEntities())
}

const createOrderAndPay = async (req, res) => {

    const validationResult = await validateOrder(req);
    if (validationResult.error === true) res.status(400).send({ message: validationResult.message });
    
    const user = validationResult.user;
    const tokenCreditCard = validationResult.tokenCreditCard;

    if (req.body.method.name === 'credit'){
        if (!user.paymentProviderId) {
            const customerData = {
                name: user.firstName,
                last_name: user.lastName, 
                email: user.access.email,
                default: true,
                phone: user.contact.phoneNumber || '0000000000'
            };
            if (tokenCreditCard) customerData['tokenCard'] = tokenCreditCard;
            console.log(customerData);
            const resp = await payGW.createCustomer(customerData);
            return res.send({resp});
    
        } else if (tokenCreditCard) {
            await payGW.addTokenToCustomer(tokenCreditCard, user.paymentProviderId);
            console.log('agregado');
        }
    }
    
    let success, data, resp;
    switch (req.body.method.name) {
        case 'pse':
            const pseData = req.body.pse;
            const PSEInfo = {
                bank: pseData.bank.toString(),
                invoice: Date.now().toString(),
                description: "Compra en ku-vid",
                value: '5000',
                tax: "0",
                tax_base: "0",
                currency: "COP",
                type_person: pseData.personType.toString(),
                doc_type: pseData.docType,
                doc_number: pseData.document.toString(),
                name: pseData.name,
                last_name: pseData.name,
                email: user.access.email,
                country: "CO",
                cell_phone: user.contact.phoneNumber.toString(),
                ip: req.connection.remoteAddress.toString(), 
                url_response: config.get("appURL") + config.get('pages.PSEpurchaseConfirmation'),
                url_confirmation: config.get("appURL") + config.get('pages.PSEpurchaseConfirmation'),
                method_confirmation: "GET",
                extra1: "",
                extra2: "",
                extra3: "",
                extra4: "",
                extra5: "",
                extra6: ""
            }
            resp = await payGW.payPSE(PSEInfo);
            if (resp.success){
                // order.paymentProviderStatus = data;
                return res.send({ 
                    success: resp.success, 
                    payment: req.body.method.name, 
                    paymentInfo: {
                        urlBank: resp.data.urlbanco 
                    }
                });
            } else {
                return res.status(400).send({ message: 'Error on payment.' });
            }
        
        case 'credit':
            const creditCardInfo = {
                token_card: token.id,
                customer_id: customer.data.customerId,
                doc_type: "CC",
                doc_number: "1035851980",
                name: "John",
                last_name: "Doe",
                email: "example@email.com",
                city: "Bogota",
                address: "Cr 4 # 55 36",
                phone: "3005234321",
                cell_phone: "3010000001",
                bill: "OR-1234",
                description: "Test Payment",
                value: "116000",
                tax: "16000",
                tax_base: "100000",
                currency: "COP",
                dues: "12",
                ip:"190.000.000.000", /*This is the client's IP, it is required */
                url_response: "https://ejemplo.com/respuesta.html",
                url_confirmation: "https://ejemplo.com/confirmacion",
                method_confirmation: "GET",
            
                //Extra params: These params are optional and can be used by the commerce
            
                use_default_card_customer: true,/*if the user wants to be charged with the card that the customer currently has as default = true*/
               
                extras: {
                    extra1: "Mi info extra 1",
                }
            }
            resp = await payGW.payCreditCard(creditCardInfo);
            break;
        default:
            const cashInfo = {
                invoice: Date.now().toString(),
                description: "Compra en ku-vid",
                value: "5000",
                tax: "0",
                tax_base: "0",
                currency: "COP",
                //type_person: "0",
                name: user.firstName,
                last_name: user.lastName,
                email: user.access.email,
                cell_phone: user.contact.phoneNumber,
                // end_date: "2021-12-05",
                ip: req.connection.remoteAddress.toString(),
                url_response: config.get("appURL") + config.get('pages.cashPurchaseConfirmation'),
                url_confirmation: config.get("appURL") + config.get('pages.cashPurchaseConfirmation'),
                method_confirmation: "GET",
            
                //Extra params: These params are optional and can be used by the commerce
                extras: {
                    extra1: "Mi info adicional 1",
                    extra2: "",
                    extra3: "",
                    extra4: "",
                    extra5: "",
                    extra6: ""
                }
            };
            resp = await payGW.payCash(req.body.method.name, cashInfo);
            if (resp.success){
                // order.paymentProviderStatus = data;
                return res.send({ 
                    success: resp.success, 
                    payment: req.body.method.name, 
                    paymentInfo: {
                        pin: resp.data.pin,
                        projectCode: resp.data.codigoproyecto,
                        paymentDate: resp.data.fechapago,
                        expirationDate: resp.data.fechaexpiracion,
                        total: resp.data.valor
                    }
                });
            } else {
                return res.status(400).send({ message: 'Error on payment.' });
            }
    }

    return res.send({});

    // const r = await payGW.createCreditCard({
    //     number: "4575623182290326",
    //     expYear: "2025",
    //     expMonth: "12",
    //     cvc: "123"
    // });
    // return res.send(r);
    // //const c = await payGW.createCustomer(r.id);
    // const d = await payGW.deleteCreditCard('visa', '457562******0326', 'joTXWjZTtRMY5ciZx');
    // const i = await payGW.getCustomer('joTXWjZTtRMY5ciZx');
    // return res.send({ r: d, i: i });

    // const validationResult = validateOrder(req);
    // if (validationResult.error === true) res.status(404).send({ message: validationResult.message });

    // const user = validationResult.user;

    

    // createOrder();


    // return res.send(await payGW.createCustomer('234234'));
} 

// Functions

const validateOrder = async (req) => {

    let user, tokenCreditCard;
    const { method, pse, creditCard }  = req.body;
    
    if (!method) return res.status(404).send({ message: 'Payment method not gotten' });

    if (req.user.isVisitor) return { error: true, message: 'Visitors cannot create orders.' };
    
    // User validations
    user = await User.findById(req.user._id);
    if (!user) return { error: true, message: 'The user with the given ID was not found.' };
    if (user.status !== 'active') return { error: true, message: 'The user is not active.' };
    if (user.cart.length === 0) return { error: true, message: 'The user does not have items in cart.' };

    switch (method.name) {
        case 'pse':
            const { errorPSE } = validatePSEpayment(pse); 
            if (errorPSE) return { error: true, message: error.details[0].message };
            break;
        case 'credit':
            if (creditCard.id && creditCard.id !== ''){
                const creditCardUser = user.creditCards.find(x => x._id == creditCard.id);
                if (!creditCardUser) return { error: true, message: 'Credit card does not exist.' };
            } else {
                const {errorCard} = validateCreditCard(creditCard);
                if (errorCard) return res.status(400).send({ message: errorCard.details[0].message });

                const r = await payGW.createCreditCard(creditCard);
                tokenCreditCard = r.id;
            }
            break;
        default:
            const { errorCash } = validateCashPayment(req.body); 
            if (errorCash) return { error: true, message: error.details[0].message };
            break;
    }

    // Validate stock of items
    const { stockError, stockErrorMessage } = validateStockItems(user.cart);
    if (stockError === true) return { error: true, message: stockErrorMessage };

    return { error: false, user, tokenCreditCard };
}

const validateStockItems = async (itemsCart) => {
    itemsCart.forEach(async (item) => {

        const itemData = await Item.findOne({ _id: item.item._id });

        if (item.selectableFields) {
            itemData.selectableFields.forEach(field => {
                if (field._id === item.selectableFields._id){
                    if (field.stock < item.quantity) {
                        return { error: true, message: `Item "${item.item.title}" does not have enough stock.` };
                    }
                }
            });
        } else {
            if (itemData.stock < item.quantity){
                return { error: true, message: `Item "${item.item.title}" does not have enough stock.` };
            }
        }
    });

    return { error: false, message: '' };
}

const createOrder = async () => {

    // Update stock
    const it = await Item.find({
        _id: '6015f5204c6d011bf09809df', 
        "selectableFields": {$elemMatch: {_id: '602802c1bca956090cb1e316'}}
    }, {"selectableFields.stock.$": 1});
}

router.get('/banks', auth, getBanks);
router.get('/cashEntities', auth, getCashEntities);
router.post('/checkout', auth, createOrderAndPay);

module.exports = router;