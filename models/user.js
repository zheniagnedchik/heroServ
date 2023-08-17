// User.js
class User {
  constructor(
    email,
    passwordHash,
    height,
    weight,
    gender,
    role,
    photo,
    video,
    services,
    age,
    thumbnails,
    avatar
  ) {
    this.email = email;
    this.passwordHash = passwordHash;
    this.height = height;
    this.weight = weight;
    this.gender = gender;
    this.role = role;
    this.photo = photo;
    this.video = video;
    this.services = services;
    this.age = age;
    this.thumbnails = thumbnails;
    this.avatar = avatar;
  }
}

module.exports = User;
