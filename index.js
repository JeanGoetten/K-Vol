var opn = require('opn')
opn('http://localhost:8088')

const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)
var binance = require('node-binance-api')().options({
    APIKEY: "<key>",
    APISECRET: "<secret>",
    useServerTime: true,
    test: true
})

app.get('/', (req, res)=>{
    res.sendFile(__dirname + '/index.html')
})

io.on('connection', (socket)=>{
    console.log('new connection', socket.id)

    var margin_down_s = 0
    var margin_down_s_5 = 0
    var margin_down_m = 0
    var margin_up_s = 0
    var margin_up_s_5 = 0
    var margin_up_m = 0
    var deep_ask_s = 0
    var deep_ask_s_5 = 0
    var deep_ask_m = 0
    var deep_bid_s = 0
    var deep_bid_s_5 = 0
    var deep_bid_m = 0
    //Precision variables
    var ideal_price_s_precision = 0
    var ideal_price_s_error = 0
    var ideal_price_5s_precision = 0
    var ideal_price_5s_error = 0
    var ideal_price_60_precision = 0
    var ideal_price_60_error = 0

    var ideal_price_s_precision_tax = 0
    var ideal_price_5s_precision_tax = 0
    var ideal_price_60_precision_tax = 0

    var tax_1_save = 0
    var tax_5_save = 0
    var tax_60_save = 0
    setInterval(()=>{
        binance.prevDay('BTCUSDT', (error, prevDay, symbol) => {
            var U_vol = prevDay.quoteVolume //universal volume per day      
            const U_sec_tot = 86400 //seconds per day
            const U_sec_tot_5 = 17280 //5 seconds per day
            const U_min_tot = 1440 //minutos per day
            var Ls = U_vol/U_sec_tot //universal volume per seconds
            var Ls5 = U_vol/U_sec_tot_5 //universal volume per 5 seconds
            var Lm = U_vol/U_min_tot //universal volume per minutes
    
            binance.depth("BTCUSDT", (error, depth, symbol) => {
                var ask_update = depth.asks
                var bid_update = depth.bids      
    
                var result_ask = []
                for(var i in ask_update){
                    result_ask.push([i, ask_update [i]])
                }
                
                var amount_ask = []
                var price_ask = []
                var colapse_ask = []
                var acumulate_ask = 0
                for (let i = 0; i < result_ask.length; i++) {
                        
                    amount_ask.push(result_ask[i][1])
                    price_ask.push(result_ask[i][0])
                    var multiply = amount_ask[i] * price_ask[i]
                    colapse_ask.push(multiply)
                    
                    var actual_valor = colapse_ask[i]
                    acumulate_ask = actual_valor + acumulate_ask
                            
                    if(acumulate_ask <= Ls){
                        margin_up_s = price_ask[i]
                        deep_ask_s = price_ask.length
                    }
                    if(acumulate_ask <= Ls5){
                        margin_up_s_5 = price_ask[i]
                        deep_ask_s_5 = price_ask.length
                    }
                    if(acumulate_ask <= Lm){
                        margin_up_m = price_ask[i]
                        deep_ask_m = price_ask.length
                    }
                }    

                var result_bid = [];
                for(var i in bid_update){
                    result_bid.push([i, bid_update [i]])
                }
    
                var amount_bid = []
                var price_bid = []
                var colapse_bid = []
                var acumulate_bid = 0
                for (let i = 0; i < result_bid.length; i++) {
                        
                    amount_bid.push(result_bid[i][1])
                    price_bid.push(result_bid[i][0])
    
                    var multiply = amount_bid[i] * price_bid[i]
                            
                    colapse_bid.push(multiply)        
                            
                    var actual_valor = colapse_bid[i]
                    acumulate_bid = actual_valor + acumulate_bid
                    
                    if(acumulate_bid <= Ls){
                        margin_down_s = price_bid[i]
                        deep_bid_s = price_bid.length
                    }
                    if(acumulate_bid <= Ls5){
                        margin_down_s_5 = price_bid[i]
                        deep_bid_s_5 = price_bid.length
                    }
                    if(acumulate_bid <= Lm){
                        margin_down_m = price_bid[i]
                        deep_bid_m = price_bid.length
                    }
                }                   
                binance.prices(['BTCUSDT'], (error, ticker) => {
                    try{
                        var price = ticker.BTCUSDT
                        var ideal_price_s = (Number(margin_down_s) + Number(margin_up_s))/2
                        var ideal_price_s_5 = (Number(margin_down_s_5) + Number(margin_up_s_5))/2
                        var ideal_price_m = (Number(margin_down_m) + Number(margin_up_m))/2

                        //SIMPLE CORRELATION TEST
                        if(ideal_price_s == price){
                            ideal_price_s_precision++
                        }else{
                            ideal_price_s_error++
                        }
                        if(ideal_price_s_5 == price){
                            ideal_price_5s_precision++
                        }else{
                            ideal_price_5s_error++
                        }
                        if(ideal_price_m == price){
                            ideal_price_60_precision++
                        }else{
                            ideal_price_60_error++
                        }
                            
                        ideal_price_s_precision_tax = (ideal_price_s_precision/(ideal_price_s_precision + ideal_price_s_error))*100      
                        if(ideal_price_s_precision_tax > tax_1_save){
                            tax_1_save = ideal_price_s_precision_tax
                            console.log("Maior precisão 01 segundos: ", tax_1_save)
                        }
                        ideal_price_5s_precision_tax = (ideal_price_5s_precision/(ideal_price_5s_precision + ideal_price_5s_error))*100
                        if(ideal_price_5s_precision_tax > tax_5_save){
                            tax_5_save = ideal_price_5s_precision_tax
                            console.log("Maior precisão 05 segundos: ", tax_5_save)
                        }
                        ideal_price_60_precision_tax = (ideal_price_60_precision/(ideal_price_60_precision + ideal_price_60_error))*100
                        if(ideal_price_60_precision_tax > tax_60_save){
                            tax_60_save = ideal_price_60_precision_tax
                            console.log("Maior precisão 60 segundos: ", tax_60_save)

                        }
                                                                                          
                        var data_set = {
                            "price":        price,
                            "ideal_price_s":  ideal_price_s,
                            "ideal_price_s_5":  ideal_price_s_5,
                            "ideal_price_m":  ideal_price_m,
                            "margin_up_s":     margin_up_s,
                            "margin_up_s_5":     margin_up_s_5,
                            "margin_up_m":     margin_up_m,
                            "margin_down_s":   margin_down_s,
                            "margin_down_s_5":   margin_down_s_5,
                            "margin_down_m":   margin_down_m,
                            "deep_ask_s": deep_ask_s,
                            "deep_ask_s_5": deep_ask_s_5,
                            "deep_ask_m": deep_ask_m,
                            "deep_bid_s": deep_bid_s,
                            "deep_bid_s_5": deep_bid_s_5,
                            "deep_bid_m": deep_bid_m
                        }
                        socket.emit('data', data_set)
                        
                    }catch{
                        //console.log(error)
                        return error              
                    }
                })
            })
        })
    }, 1000)
})

const PORT = 8088
http.listen(PORT, function(){
    console.log("Server runnig at: " + PORT)
})