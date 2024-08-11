import chalk from "chalk";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import Jimp from "jimp";
import Tesseract from "tesseract.js";
import { wpd } from "./wpd.cjs";
import { wpdObject, xmin } from "./wpdObject.js";

dayjs.extend(utc);

const retry = async (fn, options) => {
  const retryCount = options?.retryCount || Infinity;
  const sleepTime = options?.sleepTime || 1000;
  try {
    return await fn();
  } catch (error) {
    console.log(
      chalk.bgGreenBright(new Date().toISOString()),
      chalk.bgRedBright(error)
    );
    if (!retryCount) {
      throw error;
    }
    if (sleepTime) {
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
    }
    return await retry(fn, { retryCount, sleepTime });
  }
};

const digitizeImage = async (imageUrl = "./wpd/chart.gif") => {
  const [
    { bitmap },
    {
      data: { text },
    },
  ] = await Promise.all([
    retry(async () => await Jimp.read(imageUrl)),
    retry(async () => await Tesseract.recognize(imageUrl)),
  ]);

  const plotData = new wpd.PlotData();
  plotData.deserialize(wpdObject);
  const datasets = plotData.getDatasets();
  if (!datasets.length) {
    return [];
  }
  const ds = datasets[0];
  ds.clearAll();
  const autoDetector = plotData.getAutoDetectionDataForDataset(ds);
  if (!autoDetector) {
    return [];
  }
  const axes = plotData.getAxesForDataset(ds);
  autoDetector.imageWidth = bitmap.width;
  autoDetector.imageHeight = bitmap.height;
  autoDetector.generateBinaryData(bitmap);
  autoDetector.algorithm.run(autoDetector, ds, axes);

  const points = [
    { x: dayjs.utc(Math.round(xmin * 3600 * 1000)).format("HH:mm"), y: 0 },
  ];
  for (let ptIdx = 1; ptIdx < ds.getCount(); ptIdx++) {
    let { x, y } = ds.getPixel(ptIdx);
    [x, y] = axes.pixelToData(x, y);
    points.push({
      x: dayjs.utc(Math.round(x * 3600 * 1000)).format("HH:mm"),
      y: Number(y.toFixed(2)),
    });
  }
  console.log(points);
  return points;
};

digitizeImage();
