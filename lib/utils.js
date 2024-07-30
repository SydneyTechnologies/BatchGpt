import { fileTypeFromBuffer } from "file-type";

async function delay(time) {
  return await new Promise((resolve) => setTimeout(resolve, time));
}

function isJson(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}
function fromJsonToObject(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    throw new Error("Input string is an Invalid JSON string");
  }
}

function getBase64Image(image) {
  if (typeof image === "string") {
    return image;
  }
  const extension = fileTypeFromBuffer(image).ext;
  const base64Image = Buffer.from(image).toString("base64");
  return `data:image/${extension};base64,${base64Image}`;
}

export { delay, isJson, fromJsonToObject, getBase64Image };
