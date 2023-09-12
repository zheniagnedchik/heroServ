const { DocumentStore } = require("ravendb");
const bcrypt = require("bcrypt");
const jwt = require("node-jsonwebtoken");
const User = require("../models/user");
const ffmpeg = require("fluent-ffmpeg");
const multer = require("multer");
const store = new DocumentStore("http://64.226.88.96:8080", "Post");
const storeUsers = new DocumentStore("http://64.226.88.96:8080", "Users");
store.initialize();
storeUsers.initialize();
const fs = require("fs");
const path = require("path");
const Post = require("../models/post");
const URI = "http://64.226.88.96";
const FormData = require("form-data");
const axios = require("axios");

const CLOUDFLARE_API_ENDPOINT =
  "https://api.cloudflare.com/client/v4/accounts/61c83c9b6d34f2c1445f0ccd6f8a160a/stream/copy";
const API_TOKEN = "Ky8u-YkLKSef_xga_omrGPZGPLThHTMU-kkeMrXF";
const CLOUDFLARE_API_ENDPOINT_IMG =
  "https://api.cloudflare.com/client/v4/accounts/61c83c9b6d34f2c1445f0ccd6f8a160a/images/v1";

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
async function uploadVideo(videoUrl, videoName) {
  console.log(videoUrl);
  const body = {
    url: videoUrl,
    meta: {
      name: videoName,
    },
  };

  try {
    const response = await axios.post(CLOUDFLARE_API_ENDPOINT, body, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error(error.response.data); // This will log the error response from the server
  }
}

async function uploadImage(file) {
  const headers = {
    Authorization: `Bearer ${API_TOKEN}`, // Замените 'undefined' своим реальным токеном
  };
  const form = new FormData();
  // Предполагается, что у вас есть файл с именем 'image.jpg' в вашей директории, который вы хотите загрузить
  form.append("file", fs.createReadStream(file));
  // Добавьте другие данные формы, если это необходимо
  // form.append('metadata', ...);
  // form.append('requireSignedURLs', ...);
  try {
    const response = await axios.post(CLOUDFLARE_API_ENDPOINT_IMG, form, {
      headers: {
        ...headers,
        ...form.getHeaders(),
      },
    });
    return response.data;
  } catch (error) {
    console.error("Ошибка при загрузке изображения:", error);
  }
}
async function saveUser(user) {
  const session = storeUsers.openSession();
  await session.store(user);
  await session.saveChanges();
}
async function findUserByEmail(email) {
  const session = storeUsers.openSession();
  const user = await session
    .query(User)
    .whereEquals("email", email)
    .firstOrNull();
  return user;
}
exports.uploudFileToPost = async (req, res) => {
  console.log(req);
  try {
    const { email, folder, type, userId, contentType, userName } = req.body; // Email пользователя
    const user = await findUserByEmail(email);
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
          // await generateVideoThumbnail(
          //   videoPath,
          //   thumbnailPath,
          //   thumbnailFileName
          // );
          // user.photo.push({
          //   uri: path.join(folder, testName[1]),
          //   type: "video",
          //   thumbnail: thumbnailUri,
          // });
          // const prev = `${URI}/${thumbnailUri}`;
          const altUri = `${URI}/${path.join(folder, testName[1])}`;
          const data = await uploadVideo(
            `${URI}/${path.join(folder, testName[1])}`,
            name
          );
          const uri = data.result.playback.hls;
          const prev = data.result.thumbnail;
          const description = "";

          const newPost = new Post(
            userId,
            prev,
            uri,
            description,
            contentType,
            type,
            userName,
            altUri
          );

          await session.store(newPost);
          await session.saveChanges();

          console.log(
            "Файл и обложка успешно загружены и путь сохранен в базе данных."
          );
          res.json({
            uri: data.result.playback.hls,
            type: "video",
            thumbnail: data.result.thumbnail,
          });
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: "Ошибка при создании обложки видео." });
        }
      } else {
        const dataImg = await uploadImage(path.join(folder, testName[1]));
        const prev = ``;
        const uri = dataImg.result.variants[0];
        const altURI = `${URI}/${path.join(folder, testName[1])}`;
        const type = "photo";
        const description = "";
        const newPost = new Post(
          userId,
          prev,
          uri,
          description,
          contentType,
          type,
          userName,
          altURI
        );
        await session.store(newPost);
        await session.saveChanges();
        // user.photo.push({
        //   uri: path.join(folder, testName[1]),
        //   type: "photo",
        // });
      }
    } else {
      const dataImg = await uploadImage(path.join(folder, testName[1]));
      user[folder] = dataImg.result.variants[0];
      await saveUser(user);
    }
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

// exports.getPosts = async (req, res) => {
//   try {
//     const offset = parseInt(req.query.offset) || 0;
//     const limit = parseInt(req.query.limit) || 10;

//     const followingUserIds = req.body.followingUserIds; // Список ID пользователей, на которых подписан клиент

//     if (!followingUserIds || !followingUserIds.length) {
//       return res.status(400).send("followingUserIds are required");
//     }

//     const session = store.openSession();

//     // Получение постов от подписчиков
//     const feedItems = await session
//       .query({ collection: "Posts" })
//       .whereIn("userId", followingUserIds)
//       .orderByDescending("date") // предполагая, что у вас есть поле с датой создания
//       .skip(offset)
//       .take(limit)
//       .all();

//     res.send(feedItems);
//   } catch (error) {
//     res.send({ success: false, message: error.message });
//   }
// };
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

    // Получение информации о пользователях, которые создали посты
    const users = await session
      .query({ collection: "Users" })
      .whereIn(
        "id",
        feedItems.map((item) => item.userId)
      )
      .all();

    // Добавление URL аватара к каждому посту
    const feedItemsWithAvatars = feedItems.map((post) => {
      const user = users.find((u) => u.id === post.userId);
      return {
        ...post,
        userAvatarUrl: user ? user.avatar : null, // предполагается, что у объекта пользователя есть поле avatarUrl
      };
    });

    res.send(feedItemsWithAvatars);
  } catch (error) {
    res.send({ success: false, message: error.message });
  }
};
