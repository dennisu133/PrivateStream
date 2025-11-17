# Private Streaming Site

A password-gated private livestream viewer trying to achieve as little latency as possible using [WebRTC](https://webrtc.org/). This project uses [OBS Studio](https://obsproject.com/) for capturing and [SRS](https://ossrs.io/lts/en-us/) for distributing the stream.

> This is a personal project made for a very specific setup filled with inside jokes. This is generally not meant to be reproduced but I'm honored if you do.

## Preview

![player](/screenshots/player.jpg)

## Prerequesites

### Setting up SRS

This project was developed using SRS 6.0. SRS is easily deployed using [docker](https://docs.docker.com/get-started/get-docker/). SRS relies on a [candidate](https://ossrs.net/lts/en-us/docs/v6/doc/webrtc#config-candidate) environment variable to pass the IP of the stream source to the viewer. When using this project make sure to assign it a wildcard ('\*') because the backend will fetch your public IP and transmit it to SRS during connection of a new viewer using [ipify.org](https://www.ipify.org/).

For a simple setup using the default [rtc.conf](https://github.com/ossrs/srs/blob/develop/trunk/conf/rtc.conf) you can run: \
`docker run --rm -it -p 1935:1935 -p 1985:1985 -p 8080:8080 --env CANDIDATE="*" -p 8000:8000/udp ossrs/srs:6 ./objs/srs -c conf/rtc.conf`

If you want to use a custom config like the one provided in this project you will have to pass it to the container. A suitable location for the [custom.conf](tools/custom.conf) is inside `/opt/srs/custom.conf`. Using this path you can bind the config and apply it using the following command: \
`docker run --rm -it -p 1935:1935 -p 1985:1985 -p 8080:8080 -p 8000:8000/udp -v /opt/srs/custom.conf:/usr/local/srs/conf/custom.conf ossrs/srs:6 ./objs/srs -c conf/custom.conf`

Keep in mind that this is a temporary startup until the console is closed. You can test if if SRS is running by accessing: `<docker_host_IP>:8080`.

### Setting up OBS

In order to connect to the SRS server you need to specify its IP address. For this project use WHIP with the following settings (make sure to replace \<docker_host_IP\>):

- Server: http://\<docker_host_IP\>:1985/rtc/v1/whip/?app=live&stream=livestream
- Bearer Token: livestream

Since the goal is achieving the lowest latency possible there are specific OBS settings we can use. Head over to the Output settings and enable Advanced mode. The [recommended settings](https://ossrs.net/lts/en-us/blog/Experience-Ultra-Low-Latency-Live-Streaming-with-OBS-WHIP) are:

- Video Encoder: x264
- Rate Control: CBR
- Bitrate: depends on your connection
- Keyframe interval: 1s
- CPU Usage Preset: fast
- Profile: baseline
- Tune: zerolatency
- x264 options: bframes=0

### Optional: Using Nginx Proxy Manager as a reverse Proxy

[Nginx-Proxy-Manager](https://nginxproxymanager.com/) is a great reverse proxy that can route your incoming traffic to the appropriate destination. This is mandatory if you want to host multiple services under a single IP. You want to route the traffic to the machine where **this Sveltekit application is running**.

Create a proxy host with the following settings and set your SSL certificate:

- Domain Names: your domain name (e.g. stream.example.com)
- Scheme: http
- Forward Hostname/ IP: this applications IP (e.g. 192.168.1.104)
- Forward Port: 3000 (the default deployment port of Sveltekit)
- Enable Cache Assets, Block Commin Exploits, Websockets Support (!), Force SSL, Http/2 Supprt, HSTS Enabled/Subdomains

## Development

Install the dependencies using a node package manager of your choice, e.g. `bun install`. Keep in mind that the scripts inside [package.json](/package.json) are hardcoded for [bun](https://bun.com/). You will have to change them if you use anything else.

If you want to adjust the existing code you can start up a development server using `bun run dev`. The stream will be captured this way as well.

If you are using Nginx Proxy Manager I recommend setting an Access List when developing to avoid streaming a test stream to the public.

## Deployment

Before deploying you need to set some environment variables within a `.env` file and trusted CORS origins. Once you are done you can build and deploy this project by using `bun run build`. This will create a production-ready [Node](https://nodejs.org/en/about) environment.

If you want to deploy on a VPS you will need:

- build/ directory
- package.json
- .env file
- pm2_bun_workaround/ directory (if deploying with bun)

Install the production dependencies with `bun install --production` and run the application with `bun run --env-file=.env build/index.js`

_Node alternative: `node --env-file=.env build/index.js` (Requires Node 20.6.0 or higher!)_

### Environment Variables

Simply rename the existing .env.example and put in your own data. Since we don't want to store the password in plaintext (even in an .env file) we use hashes. [bcrypt](https://en.wikipedia.org/wiki/Bcrypt) provides a simple hashing algorithm and you can use the provided [hash-password.js](tools/hash-password.js) (or any online tool) to create a hash.

Because raw bcrypht hashes are sometimes difficult to parse we additionally wrap it inside [base64](https://en.wikipedia.org/wiki/Base64) to make sure the hash is always parsed correctly.

### CSRF trusted origins

This is an additional security feature that can be disabled inside [svelte.config.js](/svelte.config.js).

Sveltekit offers a built-in protection against Cross-Site Request Forgery (CSRF) attacks. We need to set trusted origins (or disable it) so submissions like the login form work correctly. To set them please do the following:

1. Navigate to the `csrf/` directory.
2. Rename `csrf-origins.example.js` to `csrf-origins.js`.
3. Open the `csrf-origins.js` and replace the placeholder domains with your own. Refer to the examples within.

### PM2

For persistent hosting I recommend using [PM2](https://pm2.keymetrics.io/). This application will keep your server running 24/7.

Currently there is a bug when running Sveltekit + bun + pm2. For more information check out [pm2_bun_workaround/](/pm2_bun_workaround/README.md).

1. Install globally using `bun install pm2 -g`
2. Link bun as node using `ln -s $(which bun) /usr/local/bin/node`
3. Start the application using `pm2 start pm2_bun_workaround/ecosystem.config.mjs`
4. Enable autostart using `pm2 startup`
5. Save the configuration using `pm2 save`

## Acknowledgements

- **[SRS](https://github.com/ossrs/srs):** For providing the fantastic framework that makes WebRTC relaying accessible and easy to implement.
- **[OBS Studio](https://github.com/obsproject/obs-studio):** For being the gold standard in broadcasting and making the streaming source setup effortless.
- **Gregory Bell** for the creation of [Web Neko](https://webneko.net/)