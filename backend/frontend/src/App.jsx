import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import "./index.css";

function App() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const cleanMarkdown = (text) => {
    if (!text) return "";

    return text
      .replace(/\\\*\*/g, "**")
      .replace(/\\\*/g, "*")
      .replace(/\\`/g, "`")
      .replace(/\\#/g, "#")
      .replace(/\\_/g, "_");
  };

  // Find nearby emergency services
  const findNearbyPlaces = (placeType) => {
    if (!navigator.geolocation) {
      alert("Location is not supported by your browser.");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        const mapsUrl =
          `https://www.google.com/maps/search/?api=1` +
          `&query=${encodeURIComponent(placeType)}` +
          `&center=${latitude},${longitude}`;

        window.open(mapsUrl, "_blank");

        setLocationLoading(false);
      },
      (error) => {
        console.error("Location error:", error);

        setLocationLoading(false);

        if (error.code === 1) {
          alert(
            "Location permission was denied. Please allow location access in your browser to find nearby help."
          );
        } else {
          alert(
            "Unable to get your current location. Please try again."
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const callEmergency = () => {
    window.location.href = "tel:112";
  };

  const askBot = async (text = question) => {
    if (!text.trim() || loading) return;

    const userQuestion = text.trim();

    // Prepare previous conversation history
    const history = messages.map((message) => ({
      role: message.type === "user" ? "user" : "assistant",
      content: message.text,
    }));

    // Add current user message to UI
    setMessages((prev) => [
      ...prev,
      {
        type: "user",
        text: userQuestion,
        time: getCurrentTime(),
      },
    ]);

    setQuestion("");
    setLoading(true);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/chat",
        {
          question: userQuestion,
          history: history,
        }
      );

      console.log("Backend response:", response.data);

      // Add assistant response to UI
      setMessages((prev) => [
        ...prev,
        {
          type: "assistant",
          text: response.data.answer || "",
          sources: response.data.sources || [],
          time: getCurrentTime(),
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);

      setMessages((prev) => [
        ...prev,
        {
          type: "assistant",
          text: "Sorry, I could not connect to the safety assistant.",
          sources: [],
          time: getCurrentTime(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedQuestions = [
    "What is the women helpline number?",
    "What should I do in an emergency?",
    "How can I protect my privacy?",
  ];

  return (
    <div className="app">
      <div className="chat-container">

        {/* Header */}
        <header className="header">

          <div className="shield">
            🛡️
          </div>

          <div>
            <h1>
              Women Safety & Support
            </h1>

            <p>
              Trusted information and support when you need it.
            </p>
          </div>

        </header>


        {/* Emergency Card */}
        <div className="emergency-card">

          <div className="emergency-icon">
            🚨
          </div>

          <div className="emergency-content">

            <h3>
              Need Immediate Help?
            </h3>

            <p>
              If you are in immediate danger, move to a safer
              location when possible and contact emergency services.
            </p>


            {/* Emergency Actions */}
            <div className="emergency-actions">

              <button
                className="emergency-help-button"
                onClick={() =>
                  findNearbyPlaces("police station")
                }
                disabled={locationLoading}
              >
                {locationLoading
                  ? "📍 Finding nearby help..."
                  : "📍 Find Nearby Police Stations"}
              </button>


              <button
                className="hospital-help-button"
                onClick={() =>
                  findNearbyPlaces("hospital")
                }
                disabled={locationLoading}
              >
                🏥 Find Nearby Hospitals
              </button>


              <button
                className="maps-help-button"
                onClick={() =>
                  findNearbyPlaces("women help center")
                }
                disabled={locationLoading}
              >
                🗺️ Find Nearby Support
              </button>

            </div>


            {/* Emergency Numbers */}
            <div className="emergency-numbers">

              <div>
                <span>
                  Emergency
                </span>

                <strong>
                  112
                </strong>
              </div>


              <div>
                <span>
                  Women Helpline
                </span>

                <strong>
                  181
                </strong>
              </div>

            </div>


            {/* Call Emergency Button */}
            <button
              className="call-emergency-button"
              onClick={callEmergency}
            >
              📞 Call Emergency Services — 112
            </button>

          </div>

        </div>


        {/* Welcome Section */}
        {messages.length === 0 && (

          <div className="welcome">

            <h2>
              How can I help you?
            </h2>

            <p>
              Ask questions about women safety, emergency support,
              privacy, and available resources.
            </p>


            <div className="suggestions">

              {suggestedQuestions.map((item, index) => (

                <button
                  key={index}
                  onClick={() => askBot(item)}
                >
                  {item}
                </button>

              ))}

            </div>

          </div>

        )}


        {/* Clear Chat Button */}
        {messages.length > 0 && (

          <div className="clear-chat-container">

            <button
              className="clear-chat"
              onClick={() => setMessages([])}
            >
              🗑️ Clear Chat
            </button>

          </div>

        )}


        {/* Conversation History */}
        <div className="chat-section">

          <div className="chat-history-title">
            💬 Conversation History
          </div>


          <div className="chat-box">

            {/* Messages */}

            {messages.map((message, index) => (

              <div
                key={index}
                className={
                  message.type === "user"
                    ? "message user-message"
                    : "message assistant-message"
                }
              >

                {/* Message Label */}
                <div className="message-label">

                  {message.type === "user"
                    ? "You"
                    : "🛡️ Safety Assistant"}

                </div>


                {/* Message Content */}
                <div className="message-text">

                  {message.type === "assistant" ? (

                    <ReactMarkdown>
                      {cleanMarkdown(message.text)}
                    </ReactMarkdown>

                  ) : (

                    message.text

                  )}

                </div>


                {/* Timestamp */}
                <div className="message-time">
                  {message.time}
                </div>


                {/* Sources */}
                {message.type === "assistant" &&
                  message.sources &&
                  message.sources.length > 0 && (

                    <div className="sources">

                      <strong>
                        📚 Sources
                      </strong>


                      <div className="source-list">

                        {message.sources.map(
                          (source, sourceIndex) => (

                            <div
                              key={sourceIndex}
                              className="source-card"
                            >
                              📄{" "}
                              {source.name ||
                                source.source ||
                                "Knowledge Base"}
                            </div>

                          )
                        )}

                      </div>

                    </div>

                  )}

              </div>

            ))}


            {/* Loading Indicator */}
            {loading && (

              <div className="message assistant-message">

                <div className="message-label">
                  🛡️ Safety Assistant
                </div>

                <div className="loading">

                  <span></span>
                  <span></span>
                  <span></span>

                </div>

              </div>

            )}

          </div>

        </div>


        {/* Input Area */}
        <div className="input-area">

          <div className="input-wrapper">

            <input
              type="text"
              placeholder="Ask a safety or support question..."
              value={question}
              maxLength={500}
              onChange={(e) =>
                setQuestion(e.target.value)
              }
              onKeyDown={(e) => {

                if (e.key === "Enter") {
                  askBot();
                }

              }}
            />


            <div className="character-count">
              {question.length}/500
            </div>

          </div>


          <button
            className="send-button"
            onClick={() => askBot()}
            disabled={
              loading ||
              !question.trim()
            }
          >
            {loading ? "..." : "Send"}
          </button>

        </div>


        {/* Privacy Information */}
        <div className="privacy">

          <span>
            🔒 Privacy protected
          </span>

          <span>
            •
          </span>

          <span>
            📚 Answers are based on the knowledge base
          </span>

          <span>
            •
          </span>

          <span>
            🛡️ Safety Support Assistant
          </span>

        </div>

      </div>
    </div>
  );
}

export default App;