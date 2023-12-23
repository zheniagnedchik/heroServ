class Trainings {
  constructor(creator, title, description, days, daysList) {
    this.creator = creator;
    this.title = title;
    this.description = description;
    this.days = days;
    this.active = false;
    this.daysList = daysList;
  }
}
module.exports = Trainings;
