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
    var margin_down_m = 0
    var margin_down_h = 0
    var margin_up_s = 0
    var margin_up_m = 0
    var margin_up_h = 0
    setInterval(()=>{
        binance.prevDay('BTCUSDT', (error, prevDay, symbol) => {
            var U_vol = prevDay.quoteVolume //universal volume per day      
            const U_sec_tot = 86400 //seconds per day
            const U_min_tot = 1440 //minutos per day
            const U_hour_tot = 24 //hours per day
            var Ls = U_vol/U_sec_tot //universal volume per seconds
            var Lm = U_vol/U_min_tot //universal volume per minutes
            var Lh = U_vol/U_hour_tot //universal volume per hour
    
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
                    }
                    if(acumulate_ask <= Lm){
                        margin_up_m = price_ask[i]
                    }
                    if(acumulate_ask <= Lh){
                        margin_up_h = price_ask[i]
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
                    }
                    if(acumulate_bid <= Lm){
                        margin_down_m = price_bid[i]
                    }
                    if(acumulate_bid <= Lh){
                        margin_down_h = price_bid[i]
                    }
                }                   
                binance.prices(['BTCUSDT'], (error, ticker) => {
                    var price = ticker.BTCUSDT
    
                    var ideal_price = (Number(margin_down_m) + Number(margin_up_m))/2
                        
                    var data_set = {
                        "price":        price,
                        "ideal_price":  ideal_price,
                        "margin_up_s":     margin_up_s,
                        "margin_up_m":     margin_up_m,
                        "margin_up_h":     margin_up_h,
                        "margin_down_s":   margin_down_s,
                        "margin_down_m":   margin_down_m,
                        "margin_down_h":   margin_down_h
                    }
    
                socket.emit('data', data_set)
            })
            })
        })
    }, 1000)
})

const PORT = 8088
http.listen(PORT, function(){
    console.log("Server runnig at: " + PORT)
})