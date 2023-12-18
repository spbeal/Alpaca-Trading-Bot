const Alpaca = require("@alpacahq/alpaca-trade-api"); // constructor
const alpaca = new Alpaca(); // Automatically grabs out of .env
const WebSocket = require('ws');

// Web sockets are like push notifications on your phone
// Whenever an event happens, you get a notification.

const wss = new WebSocket("wss://stream.data.alpaca.markets/v1beta1/news")// WebSocketSecure
wss.on('open', function() {
    console.log("Websocket connected")

    const authMsg = {
        action: 'auth',
        key: process.env.APCA_API_KEY_ID,
        secret: process.env.APCA_API_SECRET_KEY,
    };
    wss.send(JSON.stringify(authMsg));

    // Subscribe to all news feeds
    const subscribeMsg = {
        action: 'subscribe',
        news: ['*'] // ["TSLA"]
    };
    wss.send(JSON.stringify(subscribeMsg)); // connects us to live data
})

wss.on('message', async function(message) {
    console.log("Message is " + message);
    // always a string
    const currentEvent = JSON.parse(message)[0];
    // [0] = "T": "n" indicates newsEvent
    if (currentEvent.T === "n") {
        let companyImpact = 100;

        // Ask chatgpt about the headline, requires credits / money within the API. 
        //------------------------------------------------------
        const apiRequestBody = {
            "model": "gpt-3.5-turbo",
            "messages": [
                {role: "system", content: "Respond solely with a number 1-100 detailing the impact of the headline"},
                {role: "user", content: "Given the headline '" + currentEvent.headline + "', show me a number from 1-100 detailing the impact of this headline"},
                 // works better with repetition
            ]
        }
        await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(apiRequestBody),
        }).then((data) => { // returns promise
            return data.json();
        }) .then((data) => {
            // data is CHATGPT response
            console.log(data);
            console.log(data.choices[0].message)
            companyImpact = parseInt(data.choices[0].message.content);
        });
        const TickerSymbol = currentEvent.symbols[0];
        //-----------------------------------------------------------
        // const TickerSymbol = "TSLA"

        if (companyImpact >= 60) 
        {
            let order = await alpaca.createOrder({
                symbol: TickerSymbol,
                qty: 1,
                side: 'buy',
                type: 'market', // market, limit, stop, stoplimit, trailing_stop
                time_in_force: 'day', // if the day ends it won't trade
                // Other optional parameters, such as stop loss. 
            })
        }
        else if (companyImpact <= 40)
        {
            let closedPosition = alpaca.closePosition(TickerSymbol); // Can put any symbol in.
        }

        // We can do a lot here, ask anything specific in a consistent data type of way
        // In this case I am going to do 1 - 100, 1 being negative, 10 being most positive. 
    }
})