export const xmin = "8";
const xmax = "24";
const ymin = "-10000";
const ymax = "20000";
const delx = 0.25;

export const wpdObject = {
  version: [4, 2],
  axesColl: [
    {
      name: "XY",
      type: "XYAxes",
      calibrationPoints: [
        {
          px: 1.873536299765808,
          py: 266.5105386416862,
          dx: xmin,
          dy: ymin,
        },
        {
          px: 477.7517564402811,
          py: 266.5105386416862,
          dx: xmax,
          dy: ymin,
        },
        {
          px: 2.3419203747072603,
          py: 397.65807962529277,
          dx: xmin,
          dy: ymin,
        },
        {
          px: 2.3419203747072603,
          py: 2.3419203747072603,
          dx: xmax,
          dy: ymax,
        },
      ],
    },
  ],
  datasetColl: [
    {
      axesName: "XY",
      data: [],
      autoDetectionData: {
        fgColor: [236, 75, 92],
        colorDetectionMode: "fg",
        colorDistance: 120,
        algorithm: {
          algoType: "XStepWithInterpolationAlgo",
          xmin: Number(xmin),
          delx,
          xmax: Number(xmax),
          ymin: Number(ymin),
          ymax: Number(ymax),
        },
        imageWidth: 480,
        imageHeight: 400,
      },
    },
  ],
  measurementColl: [],
};
