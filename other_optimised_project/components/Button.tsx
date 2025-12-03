"use client"
import { useState } from "react"
import { motion } from "motion/react"
export default function AnimatedButton() {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <motion.div
      layout
      initial={{ borderRadius: 10 }}
      className="p-4 w-fit border border-gray-200 rounded-md"
      style={
        !isOpen
          ? {
              display: "grid",
              backgroundColor: "red",
              placeContent: "center",
            }
          : {
              width: "32rem",
              height: "10rem",
            }
      }
      onClick={() => setIsOpen(!isOpen)}
    >
      <motion.div layout className="">
        {isOpen ? (
          <motion.div>
            <motion.input
              layout
              placeholder="Add note"
              className="w-fit focus:outline-none"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            ></motion.input>
            <motion.button className="bg-blue-500 text-white px-4 py-2 rounded-md mt-auto ml-auto">
              Submit
            </motion.button>
          </motion.div>
        ) : (
          <motion.div layout className="w-fit">
            Add note
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}
