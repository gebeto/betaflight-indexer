#!/usr/bin/env node

const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const {
  getBetaflightPort,
  connectSerial,
  executeCommand,
  dumpQuad,
} = require("./dumper/index");

const argvWithoutBin = hideBin(process.argv);
const parser = yargs(argvWithoutBin.length ? argvWithoutBin : ["index"]);

parser.command({
  command: "index",
  describe: "index package",
  handler: () => {
    try {
      require("./indexer/indexer");
    } catch (err) {
      console.error(err);
    }
  },
});

parser.command({
  command: "dump",
  describe: "dump quad BNF",
  handler: async () => {
    await dumpQuad();
  },
});

parser.parse();
