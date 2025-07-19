import { json } from "express";
import { Course } from "../models/course.model.js"
import { Purchase } from "../models/purchase.model.js"
import { v2 as cloudinary } from 'cloudinary';

export const createCourse = async (req, res) => {
  console.log("Course created");
  const adminId = req.adminId;

  const { title, description, price } = req.body;
  try {
    if (!title || !description || !price) {
      return res.status(400).json({ errors: "All fields are required" })
    }
    const { image } = req.files;
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ errors: "No file uploaded" })
    }
    const allowedFormat = ["image/png", "image/jpeg"]
    if (!allowedFormat.includes(image.mimetype)) {
      return res.status(400).json({ errors: "Invalid file format. Only png and jpg are allowed" })
    }

    // cloudinary
    const cloud_response = await cloudinary.uploader.upload(image.tempFilePath)
    if (!cloud_response || cloud_response.error) {
      return res.status(400).json({ error: "Error uploading file to cloudinary" });
    }
    const courseData = {
      title,
      description,
      price,
      image: {
        public_id: cloud_response.public_id,
        url: cloud_response.url
      },
      createrId: adminId,
    }
    const course = await Course.create(courseData);
    res.json({
      message: "course created",
      course
    })
  }
  catch (error) {
    console.log(error);
    res.status(500).json({ error: "error in creating course" })
  }
  // const title =req.body.title;
  // const description =req.body.description;
  // const price =req.body.price;
  // const image =req.body.image;

};

export const updateCourse = async (req, res) => {
  const adminId = req.adminId;
  const { course_Id } = req.params;
  const { title, description, price, image } = req.body;
  try {
    const courseSearch = await Course.findById(course_Id);
    if (!courseSearch) {
      return res.status(404).json({ errors: "Course not found" })
    }
    const course = await Course.findOneAndUpdate({
      _id: course_Id,
      creatorId: adminId
    },
      {
        title,
        description,
        price,
        image: {
          public_id: image?.public_id,
          url: image?.url,
        }
      })
      if (!course) {
        return res.status(404).json({ errors: "Course not found or you are not authorized to update this course" })
      }
    res.status(201).json({ message: "Course updated successfully", course })
  } catch (error) {
    res.status(500).json({ errors: "Error in course updating" })
    console.log("Error in course updating", error);

  }

};
export const deleteCourse = async (req, res) => {
  const adminId = req.adminId;
  const { courseId } = req.params;
  try {
    const course = await Course.findOneAndDelete({
      _id: courseId,
      creatorId: adminId

    })
    if (!course) {
      return res.status(404).json({ errors: "Cannot delete created by admin" })
    }
    res.status(200).json({ message: "Deleted successfully" })
  } catch (error) {
    res.status(500).json({ errors: "Error in course deleting" })
    console.log("error in course deletion", error)
  }
};
export const getCourses = async (req, res) => {
  try {
    const courses = await Course.find({});
    res.status(201).json({ courses });
  } catch (error) {
    res.status(500).json({ errors: "Error in getting courses" });
    console.log("error to get courses");
  }
};
import Stripe from 'stripe';
import config from "../config.js";
const stripe = new Stripe(config.STRIPE_SECRET_KEY);
export const courseDetails = async (req, res) => {
  const { courseId } = req.params;
  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404), json({ message: "Course not found" });
    }
    res.status(200).json({ course })

  } catch (error) {
    res.status(500).json({ errors: "Error in details in courses deatile" });
    console.log("Error in details in courses deatile", error);

  }
}
export const buyCourses = async (req, res) => {
  const { userId } = req;
  const { courseId } = req.params;
  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    const existingPurchase = await Purchase.findOne({ userId, courseId });
    if (existingPurchase) {
      return res.status(400).json({ message: "You have already purchased this course" });
    }
    const amount = course.price;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Convert to cents
      currency: 'usd',
      payment_method_types: ["card"],
    });
    
    res.status(201).json({
      message: "Course purchased successfully",
      course,
      clientSecret: paymentIntent.client_secret
    });

  }
  catch (error) {
    res.status(500).json({ errors: "Error in buying course" });
    console.log("Error in buying course", error);
  }
} 