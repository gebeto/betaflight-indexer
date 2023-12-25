const { SerialPort } = require("serialport");
const fs = require("fs/promises");

async function getBetaflightPort(params) {
  const ports = await SerialPort.list();
  return ports.find((port) => port.manufacturer === "Betaflight");
}

const connectSerial = (port) => {
  const serial = new SerialPort({
    path: port.path,
    dataBits: 8,
    stopBits: 1,
    lock: true,
    autoOpen: true,
    baudRate: 115200,
  });

  serial.write(`#\n`);

  return serial;
};

function executeCommand(serial, command) {
  return new Promise((resolve) => {
    let response = "";
    const reader = function (data) {
      response += data;
      const dataStr = data.toString("utf-8");
      if (dataStr.endsWith("# ")) {
        serial.off("data", reader);
        resolve(response);
      }
    };

    serial.on("data", reader);

    // serial.write(`#\n${command}\n`);
    serial.write(`${command}\n`);
  });
}

function parseCommandsToObject(text) {
  const result = {};
  const splitted = text.split("\r\n");

  splitted.forEach((line) => {
    if (!line) {
      return;
    }

    const [command, ...params] = line.split(" ");

    if (command === "set") {
      if (!result[command]) result[command] = {};

      const [key, value] = params.join(" ").split(" = ");

      result[command][key] = value;
    } else {
      if (!result[command]) result[command] = [];
      result[command].push(params.join(" "));
    }
  });

  result.meta = result["#"].reduce((prev, curr) => {
    const split = curr.split(": ");
    if (split.length === 2) {
      return { ...prev, [split[0]]: split[1] };
    }
    return prev;
  }, {});

  return result;
}

async function dumpQuad() {
  const betaflightPort = await getBetaflightPort();

  if (betaflightPort) {
    const serial = connectSerial(betaflightPort);
    const data = await executeCommand(serial, "diff all");
    serial.close();
    const config = parseCommandsToObject(data);
    const name = config.meta.name;
    if (!name) {
      console.log(
        "Quad was found, but there are some issues in diff. Please try again"
      );
      return;
    }
    const dumpPath = `presets/bnf/${name}.txt`;
    fs.writeFile(
      dumpPath,
      `#$ TITLE: ${name} defaults
#$ FIRMWARE_VERSION: 4.4
#$ CATEGORY: BNF
#$ STATUS: COMMUNITY
#$ KEYWORDS: defaults
#$ AUTHOR: gebeto


${data.replace(/\r\n/g, "\n")}`,
      { encoding: "utf-8" }
    );
    console.log(`Successfully backed up: ${dumpPath}`);
  } else {
    console.log("No quad connected");
  }
}

module.exports = {
  dumpQuad,
  getBetaflightPort,
  connectSerial,
  executeCommand,
};
