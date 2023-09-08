const { DocumentStore } = require("ravendb");
const bcrypt = require("bcrypt");
const jwt = require("node-jsonwebtoken");
const User = require("../models/user");
const ffmpeg = require("fluent-ffmpeg");
const multer = require("multer");
const store = new DocumentStore("http://64.226.88.96:8080", "Post");
store.initialize();
const path = require("path");
const Post = require("../models/post");
const URI = "http://64.226.88.96";

async function generateVideoThumbnail(
  videoPath,
  thumbnailPath,
  thumbnailFileName
) {
  const vi = videoPath;
  const thumbnail = thumbnailPath;
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .on("end", () => resolve(thumbnailPath))
      .on("error", (err) => reject(err))
      .screenshots({
        timestamps: ["00:00:01"], // Время получения обложки (1 секунда)
        filename: thumbnailFileName,
        folder: thumbnailPath,
      });
  });
}

exports.uploudFileToPost = async (req, res) => {
  console.log(req);
  try {
    const { email, folder, type, userId, contentType, userName } = req.body; // Email пользователя
    // const user = await findUserByEmail(email);
    const session = store.openSession();
    const name = req.file.originalname;
    const testName = name.split("_");
    const fileUri = path.join(folder, testName[1]);
    if (folder === "photo") {
      if (type === "video") {
        const thumbnailFileName = `${testName[1]}.jpg`;
        const thumbnailUri = path.join(folder, thumbnailFileName);
        const videoPath = req.file.path; // Путь к загруженному видео
        const thumbnailPath = path.join(__dirname, folder); // Папка для сохранения обложки
        const thumbnailFullPath = path.join(thumbnailPath, thumbnailFileName);
        try {
          await generateVideoThumbnail(
            videoPath,
            thumbnailPath,
            thumbnailFileName
          );
          // user.photo.push({
          //   uri: path.join(folder, testName[1]),
          //   type: "video",
          //   thumbnail: thumbnailUri,
          // });
          const prev = `${URI}/${thumbnailUri}`;
          const uri = `${URI}/${path.join(folder, testName[1])}`;
          const description = "";
          const newPost = new Post(
            userId,
            prev,
            uri,
            description,
            contentType,
            type,
            userName
          );
          await session.store(newPost);
          await session.saveChanges();

          console.log(
            "Файл и обложка успешно загружены и путь сохранен в базе данных."
          );
          //   res.json({
          //     uri: path.join(folder, testName[1]),
          //     type: "video",
          //     thumbnail: thumbnailUri,
          //   });
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: "Ошибка при создании обложки видео." });
        }
      } else {
        const prev = ``;
        const uri = `${URI}/${path.join(folder, testName[1])}`;
        const type = "photo";
        const description = "";
        const newPost = new Post(
          userId,
          prev,
          uri,
          description,
          contentType,
          type,
          userName
        );
        await session.store(newPost);
        await session.saveChanges();
        // user.photo.push({
        //   uri: path.join(folder, testName[1]),
        //   type: "photo",
        // });
      }
    } else {
      //   user[folder] = path.join(folder, testName[1]);
    }

    // await saveUser(user);
    res.json({
      message: "Изображение успешно загружено и путь сохранен в базе данных.",
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Произошла ошибка при обновлении пути в базе данных." });
  }
};

exports.getPosts = async (req, res) => {
  try {
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 10;

    const followingUserIds = req.body.followingUserIds; // Список ID пользователей, на которых подписан клиент

    if (!followingUserIds || !followingUserIds.length) {
      return res.status(400).send("followingUserIds are required");
    }

    const session = store.openSession();

    // Получение постов от подписчиков
    const feedItems = await session
      .query({ collection: "Posts" })
      .whereIn("userId", followingUserIds)
      .orderByDescending("date") // предполагая, что у вас есть поле с датой создания
      .skip(offset)
      .take(limit)
      .all();

    res.send(feedItems);
  } catch (error) {
    res.send({ success: false, message: error.message });
  }
};
