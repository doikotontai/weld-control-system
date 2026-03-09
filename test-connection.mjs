import https from 'node:https'

function testConnection(url) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, (response) => {
            console.log(`Connected. Status: ${response.statusCode}`)
            resolve(response.statusCode)
        })

        request.on('error', (error) => {
            console.log(`Error: ${error.code} - ${error.message}`)
            reject(error)
        })

        request.setTimeout(10000, () => {
            console.log('Timeout after 10s')
            request.destroy()
            reject(new Error('Timeout'))
        })
    })
}

console.log('Testing Supabase connectivity...')
testConnection('https://dvazznhnstlowhdvgee.supabase.co/auth/v1/health')
    .then(() => {
        console.log('Network OK - Supabase reachable.')
    })
    .catch((error) => {
        console.log('\nNetwork FAILED.')
        console.log('Error code:', error.code)
        if (error.code === 'ENOTFOUND') console.log('DNS cannot resolve dvazznhnstlowhdvgee.supabase.co')
        if (error.code === 'ETIMEDOUT') console.log('Connection timed out - firewall/proxy may be blocking')
        if (error.code === 'ECONNREFUSED') console.log('Connection refused')
    })
