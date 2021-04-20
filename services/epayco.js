const config = require('config');
const token = require('epayco-sdk-node/lib/resources/token');
const fetch = require('node-fetch');

const epayco = require('epayco-sdk-node')({
    apiKey: config.get('epaycoPublicKey'),
    privateKey: config.get('epaycoPrivateKey'),
    lang: 'ES',
    test: false
});

class Epayco {

    /**
     * Get list of the banks for PSE
     */
    static listBanks = function() {
        return fetch(`https://secure.payco.co/restpagos/pse/bancos.json?public_key=${config.get('epaycoPublicKey')}`)
            .then(response => response.json())
            .then(result => {
                let data = result.data;
                data.shift(); // remove first element: zero id
                return data.map(x => ({ id: x.bankCode, value: x.bankName }));
            })
            .catch(error => {
                console.log('error', error)
                return [];
            });
    }

    /**
     * Get list of the entities for cash payment
     */
    static listCashEntities = function() {
        return [
            { id: 'efecty', value: 'Efecty' },
            { id: 'baloto', value: 'Baloto' },
            { id: 'gana', value: 'Gana' },
            { id: 'redservi', value: 'Red Servi' },
            { id: 'puntored', value: 'Punto Red' },
        ]
    }

    static createCreditCard = async function(data) {

        const credit_info = {
            "card[number]": data.number,
            "card[exp_year]": data.expYear,
            "card[exp_month]": data.expMonth,
            "card[cvc]": data.cvc
        }    
        return await epayco.token.create(credit_info);
    }

    static deleteCreditCard = async function(franchise, mask, customerId) {
        const info = {
            franchise: franchise,
            mask: mask,
            customer_id: customerId
        };
        return await epayco.customers.delete(info);
    }

    static addTokenToCustomer = async function(tokenId, customerId) {
        const info = {
            token_card: tokenId,
            customer_id: customerId
        }
        return await epayco.customers.addNewToken(info);
    }

    static createCustomer = async function(data) {

        const customerInfo = {
            name: data.firstName,
            last_name: data.lastName, 
            email: data.email,
            default: true,
            phone: data.phoneNumber
        };
        if (data.tokenCard) customerInfo['token_card'] = data.tokenCard;

        return await epayco.customers.create(customerInfo);
    }

    static getCustomer = async function(customerId){
        const customerInfo = await epayco.customers.get(customerId);
        return customerInfo;
    }

    static payPSE = async function(data) {

        //createCustomer();

        // var PSEInfo = {
        //     bank: "1151",
        //     invoice: "1472050778",
        //     description: "Compra en ku-vid",
        //     value: "10000",
        //     tax: "0",
        //     tax_base: "0",
        //     currency: "COP",
        //     type_person: "0",
        //     doc_type: "CC",
        //     doc_number: "10358519",
        //     name: "kuvid",
        //     last_name: "PAYCO",
        //     email: "ej@ku-vid.com",
        //     country: "CO",
        //     cell_phone: "3010000001",
        //     ip:"190.000.000.000", /*This is the client's IP, it is required */
        //     url_response: "https://ejemplo.com/respuesta.html",
        //     url_confirmation: "https://ejemplo.com/confirmacion",
        //     method_confirmation: "GET",
        
        //     //Extra params: These params are optional and can be used by the commerce
        //     extra1: "",
        //     extra2: "",
        //     extra3: "",
        //     extra4: "",
        //     extra5: "",
        //     extra6: ""
            
        // }
        const pse = await epayco.bank.create(data);
        return pse;
    }

    static payCash = async function(cashEntity, data) {

        // var cashInfo = {
        //     invoice: "1472050778",
        //     description: "pay test",
        //     value: "20000",
        //     tax: "0",
        //     tax_base: "0",
        //     currency: "COP",
        //     type_person: "0",
        //     doc_type: "CC",
        //     doc_number: "10358519",
        //     name: "testing",
        //     last_name: "PAYCO",
        //     email: "test@mailinator.com",
        //     cell_phone: "3010000001",
        //     end_date: "2021-12-05",
        //     ip:"190.000.000.000", /*This is the client's IP, it is required */
        //     url_response: "https://ejemplo.com/respuesta.html",
        //     url_confirmation: "https://ejemplo.com/confirmacion",
        //     method_confirmation: "GET",
        
        //     //Extra params: These params are optional and can be used by the commerce
        //     extras: {
        //         extra1: "Mi info adicional 1",
        //         extra2: "",
        //         extra3: "",
        //         extra4: "",
        //         extra5: "",
        //         extra6: ""
        //     }
        // }
        const cash = await epayco.cash.create(cashEntity, data);
        return cash;
        // epayco.cash.create("efecty", cash_info)
        // epayco.cash.create("gana", cash_info) 
        // epayco.cash.create("baloto", cash_info)//expiration date can not be longer than 30 days
        // epayco.cash.create("redservi", cash_info)//expiration date can not be longer than 30 days
        // epayco.cash.create("puntored", cash_info)//expiration date can not be longer than 30 days
        // epayco.cash.create("sured", cash_info)//expiration date can not be longer than 30 days
    }

    static payCreditCard = async function(data){

        const token = await this.createCreditCard();
        const customer = await this.createCustomer(token.id);

        const paymentInfo = {
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
        return await epayco.charge.create(paymentInfo);
    }
}

module.exports = Epayco;