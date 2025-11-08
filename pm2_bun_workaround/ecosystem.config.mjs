export const apps = [
  {
    name: "PrivateStream",
    script: "pm2_bun_workaround/pm2-wrapper.js",
    interpreter: "bun",
    interpreter_args: "--env-file=.env",
    env: {
      NODE_ENV: "production",
      PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}`,
    },
  },
];
