# Private Streaming Site

A password-gated private livestream viewer trying to achieve as little latency as possible using [WebRTC](https://webrtc.org/). This project uses [OBS Studio](https://obsproject.com/) for capturing and [SRS](https://ossrs.io/lts/en-us/) for distributing the stream.

> This is a personal project made for a very specific setup filled with inside jokes. This is generally not meant to be reproduced but I'm honored if you do.

## Preview

![player](/screenshots/player.jpg)

## Prerequesites

### Setting up SRS

This project was developed using SRS 6.0. SRS is easily deployed using [docker](https://docs.docker.com/get-started/get-docker/). SRS relies on a [candidate](https://ossrs.net/lts/en-us/docs/v6/doc/webrtc#config-candidate) environment variable to pass the IP of the stream source to the viewer. When using this project make sure to assign it a wildcard ('\*') because the backend transmits your public IP to SRS (via the `eip` query parameter) during connection of a new viewer.

The backend determines your public IP as follows:

1. If `SERVER_PUBLIC_IP` is set in `.env`, it is used directly and no external service is ever contacted. Recommended whenever your public IP is static (e.g. a VPS).
2. Otherwise the IP is fetched from public echo services ([api.ipify.org](https://www.ipify.org/), ipv4.icanhazip.com and checkip.amazonaws.com by default, configurable via `IP_LOOKUP_URLS`), trying each in order. The result is cached for 60 seconds, so a changing residential IP is picked up within about a minute.
3. If every lookup fails, the last known IP is reused so viewers can keep connecting during a lookup outage.

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

### HTTPS reverse proxy

[Nginx-Proxy-Manager](https://nginxproxymanager.com/) is a convenient way to terminate HTTPS and route incoming traffic to the machine where **this SvelteKit application is running**. Production authentication cookies are `Secure`, so internet-facing deployments must use HTTPS.

Create a proxy host with the following settings and set your SSL certificate:

- Domain Names: your domain name (e.g. stream.example.com)
- Scheme: http
- Forward Hostname/ IP: this applications IP (e.g. 192.168.1.104)
- Forward Port: 3000 (the default deployment port of Sveltekit)
- Enable Cache Assets, Block Commin Exploits, Websockets Support (!), Force SSL, Http/2 Supprt, HSTS Enabled/Subdomains

## Development

Install the dependencies using a node package manager of your choice, e.g. `bun install`. Keep in mind that the scripts inside [package.json](/package.json) are hardcoded for [bun](https://bun.com/). You will have to change them if you use anything else.

If you want to adjust the existing code you can start up a development server using `bun run dev`. The stream will be captured this way as well. The development server binds to `127.0.0.1` by default and should not be exposed directly to a network.

If remote development is unavoidable, use a VPN or a TLS-protected reverse proxy with an independent Access List. You can explicitly opt in to a network listener with `bun run dev -- --host 0.0.0.0`.

## Deployment

Before deploying you need to set some environment variables within a `.env` file. Once you are done you can build and deploy this project by using `bun run build`. This will create a production-ready [Node](https://nodejs.org/en/about) environment.

If you want to deploy on a VPS you will need:

- build/ directory
- package.json
- .env file
- pm2_bun_workaround/ directory (if deploying with bun)

Install the production dependencies with `bun install --production` and run the application with `bun run --env-file=.env build/index.js`

_Node alternative: `node --env-file=.env build/index.js` (Requires Node 20.6.0 or higher!)_

### Environment Variables

Copy `.env.example` to `.env` and fill in your own values. Never commit `.env`.

Generate the bcrypt password verifier using a hidden prompt so the password does not appear in shell history or process listings:

```sh
bun tools/hash-password.js
```

Because raw bcrypt hashes are sometimes difficult to parse, the script additionally wraps the hash in [base64](https://en.wikipedia.org/wiki/Base64).

Sessions use a separate high-entropy signing secret. Generate it with:

```sh
bun tools/generate-session-secret.js
```

Store the result as `SESSION_SECRET`. Rotating it invalidates every existing session but does not change the stream password.

Set `ORIGIN` to the one public HTTPS origin from which viewers access the app. This avoids origin ambiguity across Cloudflare and a reverse proxy:

```sh
ORIGIN=https://stream.example.com
```

### Reverse proxy client addresses

Login throttling has both a global budget and a per-client budget. When the Bun server is behind one trusted reverse proxy, configure:

```sh
PROTOCOL_HEADER=x-forwarded-proto
HOST_HEADER=x-forwarded-host
ADDRESS_HEADER=x-forwarded-for
XFF_DEPTH=1
```

Put these values in `.env` if you use them. Do not trust forwarded headers when clients can connect directly to the Bun port; firewall that port so only the reverse proxy can reach it. Adjust `XFF_DEPTH` if more than one trusted proxy is in front of the app.

For a Cloudflare-proxied domain, `ADDRESS_HEADER=cf-connecting-ip` is simpler than counting the Cloudflare and Nginx hops, provided the Bun origin is reachable only through those trusted proxies.

### PM2

For persistent hosting I recommend using [PM2](https://pm2.keymetrics.io/). This application will keep your server running 24/7.

> [!IMPORTANT]
> Always run this application as a **single process** (PM2 fork mode, the default). Live state — connected reaction listeners, rate-limit counters and the cached public IP — is held in memory, so PM2 cluster mode (or any multi-instance setup) would split viewers across processes that cannot see each other's reactions.

The app exposes an unauthenticated liveness probe at `/healthz` (returns `200 ok`). Point your uptime monitor at it to distinguish "process running" from "app actually serving requests". It does not check SRS or the stream itself.

Currently there is a bug when running Sveltekit + bun + pm2. For more information check out [pm2_bun_workaround/](/pm2_bun_workaround/README.md).

1. Install globally using `bun install pm2 -g`
2. Link bun as node using `ln -s $(which bun) /usr/local/bin/node`
3. Start the application using `pm2 start pm2_bun_workaround/ecosystem.config.mjs`
4. Enable autostart using `pm2 startup`
5. Save the configuration using `pm2 save`

## Acknowledgements

- **[SRS](https://github.com/ossrs/srs):** For providing the fantastic framework that makes WebRTC relaying accessible and easy to implement.
- **[OBS Studio](https://github.com/obsproject/obs-studio):** For being the gold standard in broadcasting and making the streaming source setup effortless.
