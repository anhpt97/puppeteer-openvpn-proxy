import axios from "axios";
import { exec } from "child_process";
import { CronJob } from "cron";
import express from "express";
import { /* access, */ existsSync, mkdirSync, promises, writeFile } from "fs";
import { HttpsProxyAgent } from "https-proxy-agent";
import { join } from "path";
// import { launch } from "puppeteer";

const COUNTRY_BLACKLIST = ["Japan", "United States"];
const path = join(process.cwd(), "configs");
const portPrefix = "80";
const ports = [...Array(2 /* Number of proxy servers */).keys()].map((n) =>
  n + 1 < 10 ? `${portPrefix}0${n + 1}` : `${portPrefix}${n + 1}`
);
const CronExpression = { EVERY_20_SECONDS: "*/20 * * * * *" };
const CURL_TIMEOUT = 10;
const URL = "https://www.google.com";

const getPortIndex = (port, portPrefix) => port.replace(portPrefix, "");
const getFilename = (portIndex) => `config_${portIndex}.ovpn`;
const fetchVpns = async () => {
  const { data } = await axios.get("http://www.vpngate.net/api/iphone");
  const [str, ...rest] = data.split("\n").slice(1, -2);
  const keys = str.split(",");
  return rest.flatMap((str) => {
    if (COUNTRY_BLACKLIST.some((country) => str.includes(country))) {
      return [];
    }
    const values = str.split(",");
    return keys.reduce(
      (acc, key, i) =>
        key === "OpenVPN_ConfigData_Base64\r"
          ? {
              ...acc,
              OpenVPN_ConfigData_Base64: Buffer.from(values[i], "base64")
                .toString()
                .replace("cipher ", "data-ciphers "),
            }
          : {
              ...acc,
              [key]: values[i],
            },
      {}
    );
  });
};
const getProxyUrl = (port) => `http://172.17.0.1:${port}`;

express().listen(async () => {
  if (!existsSync(path)) {
    mkdirSync(path);
  }
  // const missingPortIndexes = (
  //   await Promise.all(
  //     ports.map(
  //       (port) =>
  //         new Promise((resolve) => {
  //           const portIndex = getPortIndex(port, portPrefix);
  //           return access(join(path, getFilename(portIndex)), (err) =>
  //             resolve(err instanceof Error && portIndex)
  //           );
  //         })
  //     )
  //   )
  // ).filter((portIndex) => portIndex);
  // if (!missingPortIndexes.length) {
  //   return;
  // }
  const vpns = await fetchVpns();
  // await Promise.all(
  //   missingPortIndexes.map((portIndex, i) =>
  //     promises.writeFile(
  //       join(path, getFilename(portIndex)),
  //       vpns[i]["OpenVPN_ConfigData_Base64"]
  //     )
  //   )
  // );
  await Promise.all(
    ports.map((port, i) =>
      promises.writeFile(
        join(path, getFilename(getPortIndex(port, portPrefix))),
        vpns[i]["OpenVPN_ConfigData_Base64"]
      )
    )
  );
  await new Promise((resolve) =>
    exec("docker compose down -v && docker compose up -d", resolve)
  );

  new CronJob(CronExpression.EVERY_20_SECONDS, async () => {
    // const options = {
    //   headless: false,
    //   args: ["--no-sandbox"],
    // };
    // const [browser1, browser2] = await Promise.all(
    //   ports.map((port) => {
    //     options.args?.push(`--proxy-server=${getProxyUrl(port)}`);
    //     return launch(options);
    //   })
    // );
    // const [page1, page2] = await Promise.all([
    //   browser1.newPage(),
    //   browser2.newPage(),
    // ]);
    // const url = "https://whatismyipaddress.com";
    // try {
    //   await Promise.all([page1.goto(url), page2.goto(url)]);
    //   await new Promise((resolve) => setTimeout(resolve, 1000));
    // } catch {
    // } finally {
    //   void Promise.all([browser1.close(), browser2.close()]);
    // }

    // const browser = await launch({
    //   headless: false,
    //   args: ["--no-sandbox"],
    // });
    // const page = await browser.newPage();
    // await page.goto("https://ipaddress.my");
    // console.log(
    //   await Promise.all([
    //     page.$eval(
    //       "li > span",
    //       ({ textContent } /* ({ textContent }, ...) */) => textContent
    //       /* ... */
    //     ),
    //     page.$$eval("tbody > tr", (elements) =>
    //       elements.map(
    //         ({ textContent } /* ({ textContent }, ...) */) =>
    //           textContent.replace(/^\s+|\s+$/g, "")
    //         /* ... */
    //       )
    //     ),
    //     page.evaluate(() =>
    //       [...document.getElementsByClassName("pull-left")].map(
    //         ({ textContent }) => textContent
    //       )
    //     ),
    //     page.evaluate(() =>
    //       [...document.getElementsByTagName("form")].flatMap(
    //         (e) =>
    //           e.querySelector(
    //             'input[type="text"][class="form-control"][id="ip-address"]'
    //           )?.value || []
    //       )
    //     ),
    //     page.evaluate(() =>
    //       [...document.getElementsByTagName("img")].map(({ src }) => src)
    //     ),
    //   ])
    // );

    try {
      (
        await Promise.all(
          ports.map((port) =>
            axios
              .create({
                httpsAgent: new HttpsProxyAgent(getProxyUrl(port)),
              })
              .get("https://ipaddress.my")
          )
        )
      ).forEach(({ data }, i) =>
        console.log(
          getProxyUrl(ports[i]),
          data
            .match(/<td>(\d+\.){3}\d+<\/td>/g)?.[0]
            ?.replace(/<td>|<\/td>/g, "")
        )
      );
    } catch {}
  }).start();

  new CronJob(CronExpression.EVERY_20_SECONDS, async () => {
    const stoppedPortIndexes = (
      await Promise.all(
        ports.map(
          (port) =>
            new Promise((resolve) =>
              exec(
                `curl --connect-timeout ${CURL_TIMEOUT} -o /dev/null -x ${getProxyUrl(
                  port
                )} ${URL} -w %{http_code}`,
                (_, stdout) =>
                  resolve(
                    !stdout.startsWith("2") && getPortIndex(port, portPrefix) // getPortIndex(port, portPrefix)
                  )
              )
            )
        )
      )
    ).filter((portIndex) => portIndex);
    if (!stoppedPortIndexes.length) {
      return;
    }
    const vpns = await fetchVpns();
    stoppedPortIndexes.forEach((portIndex, i) =>
      writeFile(
        join(path, getFilename(portIndex)),
        vpns[i]["OpenVPN_ConfigData_Base64"], // vpns[(Math.random() * vpns.length) | 0]["OpenVPN_ConfigData_Base64"],
        () => exec(`docker restart proxy_server_${portIndex}`)
      )
    );
  }).start();
});
