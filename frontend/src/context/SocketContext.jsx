import React, { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/authStore";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Connect socket
    socketRef.current = io(
      import.meta.env.VITE_API_URL?.replace("/api/v1", "") || "/",
      {
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
      },
    );

    socketRef.current.on("connect", () => {
      // Subscribe to personal notification room
      socketRef.current.emit("subscribe", user._id);
    });

    // Listen for task status change notifications
    socketRef.current.on(
      "task:status_changed",
      ({ taskTitle, newStatus, updatedBy }) => {
        toast.success(
          `"${taskTitle}" moved to ${newStatus.replace("_", " ")} by ${updatedBy}`,
          { duration: 5000, position: "top-right" },
        );
      },
    );

    socketRef.current.on("disconnect", () => {
      console.debug("Socket disconnected");
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [isAuthenticated, user?._id]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
