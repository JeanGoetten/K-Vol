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

    var price_down = 0
    var price_up = 0
    setInterval(()=>{
        binance.prevDay('BTCUSDT', (error, prevDay, symbol) => {
            var U_vol = prevDay.quoteVolume //universal volume per day      
            const U_min_tot = 1440 //minutos per day
            var L = U_vol/U_min_tot //universal volume per seconds
    
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
                            
                    if(acumulate_ask <= L){
                        price_up = price_ask[i]
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
                    
                    if(acumulate_bid <= L){
                        price_down = price_bid[i]
                    }
                }                   
                binance.prices(['BTCUSDT'], (error, ticker) => {
                    var price = ticker.BTCUSDT
    
                    var ideal_price = (Number(price_down) + Number(price_up))/2
                        
                    var data_set = {
                        "price":        price,
                        "ideal_price":  ideal_price,
                        "up_price":     price_up,
                        "down_price":   price_down
                    }
    
                socket.emit('data', data_set)
            })
            })
        })
    }, 60000)
})

const PORT = 8088
http.listen(PORT, function(){
    console.log("Server runnig at: " + PORT)
})