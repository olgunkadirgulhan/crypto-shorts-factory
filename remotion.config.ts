import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.setCrf(20);
Config.setConcurrency(2);
Config.setChromiumOpenGlRenderer("angle-egl");
Config.setOverwriteOutput(true);
