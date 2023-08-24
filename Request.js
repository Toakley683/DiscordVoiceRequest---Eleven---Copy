const express = require('express')
const app = express()
const port = 443

const voice = require("elevenlabs-node");
const fs = require('fs');
const ngrok = require('ngrok');

let CharactersUsed = 0

// NGROK Auth Key can be gotten from 'https://ngrok.com/'
// Create an Account and goto "Your Authtoken"
// Paste the Auth Token below!

// DO NOT SET THE API KEYS HERE
// SET THE API KEYS AT 'Config.yml'

fs.readFile( "Config.json", "utf8", ( error, data ) => {

    const Data = JSON.parse( data )

    ElevenApiKey = Data.ElevenLabsAPIKey
    ngrokAuthenticationKey = Data.NgrokAPIKey
    DiscordBotToken = Data.DiscordToken
    DiscordChannelID = Data.ChannelID

    if( Data.ElevenLabsAPIKey == undefined ) { throw( "NO ELEVEN LABS API KEY" ); }
    if( Data.NgrokAPIKey == undefined ) { throw( "NO NGROK API KEY" ); }
    if( Data.DiscordToken == undefined ) { throw( "NO DISCORD BOT TOKEN" ); }
    if( Data.ChannelID == "" ) { throw( "DISCORD CHANNELID REQUIRED" ) }

    tokensCollected( ElevenApiKey, ngrokAuthenticationKey, DiscordBotToken, DiscordChannelID )

})

function tokensCollected( ElevenApiKey, ngrokAuthenticationKey, DiscordBotToken, DiscordChannelID ) {

    (async function() {
        
        const url = await ngrok.connect( { 
            proto: 'http',
            addr: 'http://localhost:443',
            authtoken: ngrokAuthenticationKey,
            configPath: './ngrokConfig/ngrok.yml'
        });
        console.log( "Set the NGROK URL on Starfall to : " + url )
    })();

    const fileName = "sfx/message.mpeg"; // The name of your audio file

    const modelID = "eleven_multilingual_v2"

    let Channel

    app.get('/:Voice/:Stability/:Boost/:Text', (req, response) => {

        const Text = req.params.Text
        const VoiceID = req.params.Voice

        const stability = req.params.Stability
        const similarityBoost  = req.params.Boost

        voice.textToSpeechStream( ElevenApiKey, VoiceID, Text, stability, similarityBoost, modelID ).then((res) => {

            res.pipe( fs.createWriteStream( fileName ) ).on( "finish", () => {
                
                fs.readFile( fileName, function(err, data) {
                    
                    if( err ) { throw( err ) }

                    response.set( "ngrok-skip-browser-warning", "" )
                    response.set( "User-Agent", "custom/non-standard" )

                    CharactersUsed = CharactersUsed + Text.length

                    console.log( CharactersUsed )

                    Channel.send( {
                        content: "Message = [ '" + Text + "' ]",
                        files: [{
                            attachment: data,
                            name: 'voice.mp3'
                        }]
                    })
                    .then(
                        message => response.send( Array.from( message.attachments )[0][1].proxyURL )
                    )
            
                })

            });
        
        });
    })

    app.listen(port, () => {
        
        console.log(`Example app listening on port ${port}`)

    })

    // Discord Bot Setup

    const Discord = require( 'discord.js' );
    const client = new Discord.Client( { intents: [ 
            "Guilds",
            "GuildMessages", 
            "GuildMembers",
            "MessageContent", 
        ] 
    });

    client.login( DiscordBotToken )

    client.on( "messageCreate", message => {

        if( message.content == "!file" ) {

            fs.readFile( fileName, function(err, data) {

                voiceData = data
                
                message.channel.send( {
                    content: "Message = [ '" + textInput + "' ]",
                    files: [{
                    attachment: voiceData,
                    name: 'voice.mp3'
                    }]
                })

            });

        }

    })

    client.on('ready', () => {
        client.channels.fetch( DiscordChannelID )
        .then( channel => Channel = channel );
    });

}