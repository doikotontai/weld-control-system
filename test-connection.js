// Test kết nối Supabase
const https = require('https')

function testConnection(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            console.log(`✅ Connected! Status: ${res.statusCode}`)
            resolve(res.statusCode)
        })
        req.on('error', (err) => {
            console.log(`❌ Error: ${err.code} - ${err.message}`)
            reject(err)
        })
        req.setTimeout(10000, () => {
            console.log('❌ Timeout after 10s')
            req.destroy()
            reject(new Error('Timeout'))
        })
    })
}

console.log('Testing Supabase connectivity...')
testConnection('https://dvazznhnstlowhdvgee.supabase.co/auth/v1/health')
    .then(() => {
        console.log('Network OK - Supabase reachable!')
    })
    .catch((err) => {
        console.log('\nNetwork FAILED.')
        console.log('Error code:', err.code)
        if (err.code === 'ENOTFOUND') console.log('→ DNS cannot resolve dvazznhnstlowhdvgee.supabase.co')
        if (err.code === 'ETIMEDOUT') console.log('→ Connection timed out - firewall/proxy may be blocking')
        if (err.code === 'ECONNREFUSED') console.log('→ Connection refused')
    })
