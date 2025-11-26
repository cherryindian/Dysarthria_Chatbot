import { GiGraduateCap } from "react-icons/gi";
import { MdEditNote } from "react-icons/md";
import { PiLightbulb } from "react-icons/pi";
import { VscVscodeInsiders } from "react-icons/vsc";
import { FaCode } from "react-icons/fa";

import React from "react";

const chatData = [
  {
    title: "Create image",
    icon: <PiLightbulb />,
    iconColor: "#e2c541",
  },
  {
    title: "Get advice",
    icon: <MdEditNote />,
    iconColor: "#c285c7",
  },
  {
    title: "Summarize Text",
    icon: <VscVscodeInsiders />,
    iconColor: "#e86060",
  },
  {
    title: "Code",
    icon: <FaCode />,
    iconColor: "#76d0eb",
  },
  {
    title: "More",
  },
];

const ChatHelp = () => {
  return (
    <div className="w-full flex flex-col md:items-center md:flex-row justify-center gap-3">
      {chatData?.map((item, index) => (
        <div
          key={index}
          className="flex items-center gap-2 border border-grey-600 rounded-full px-2 py-1 hover:border-white/50 duration-300 hover:bg-white/10"
        >
          {item?.icon && (
            <span className="text-xl" style={{ color: item?.iconColor }}>
              {item?.icon}
            </span>
          )}
          <p>{item?.title}</p>
        </div>
      ))}
    </div>
  );
};

export default ChatHelp;
