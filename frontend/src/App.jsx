import { useState, useRef, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import "./index.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function App() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [sirenActive, setSirenActive] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const audioCtxRef = useRef(null);
  const sirenIntervalRef = useRef(null);

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

  // Find nearby emergency/support locations
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
        } else if (error.code === 2) {
          alert(
            "Your location could not be determined. Please check your device location settings and try again."
          );
        } else if (error.code === 3) {
          alert(
            "Location request timed out. Please try again."
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

  // Call emergency number
  const callEmergency = (number = "112") => {
    window.location.href = `tel:${number}`;
  };

  // Loud Siren using Web Audio API
  const startSiren = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        alert("Audio is not supported on this browser.");
        return;
      }
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      let freq = 650;
      let rising = true;
      const interval = setInterval(() => {
        if (rising) {
          freq += 50;
          if (freq >= 1150) rising = false;
        } else {
          freq -= 50;
          if (freq <= 650) rising = true;
        }
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
      }, 40);

      audioCtxRef.current = { ctx, osc };
      sirenIntervalRef.current = interval;
      setSirenActive(true);
    } catch (err) {
      console.error("Audio error:", err);
    }
  };

  const stopSiren = () => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.osc.stop();
        audioCtxRef.current.ctx.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
    setSirenActive(false);
  };

  const toggleSiren = () => {
    if (sirenActive) {
      stopSiren();
    } else {
      startSiren();
    }
  };

  const closeSosModal = () => {
    stopSiren();
    setSosModalOpen(false);
  };

  // Clean up audio if component unmounts
  useEffect(() => {
    return () => {
      stopSiren();
    };
  }, []);

  // Broadcast SOS with Live GPS Location
  const shareLocationSOS = (platform) => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setSharingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSharingLocation(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const mapLink = `https://maps.google.com/?q=${lat},${lng}`;
        const message = encodeURIComponent(
          `🚨 EMERGENCY SOS: I am in immediate danger and need help! My current live location is: ${mapLink}`
        );

        if (platform === "whatsapp") {
          window.open(`https://api.whatsapp.com/send?text=${message}`, "_blank");
        } else {
          window.location.href = `sms:?body=${message}`;
        }
      },
      (err) => {
        setSharingLocation(false);
        console.error("Geolocation error:", err);
        const fallbackMsg = encodeURIComponent(
          "🚨 EMERGENCY SOS: I am in immediate danger and need help! Please contact me or emergency services immediately."
        );
        if (platform === "whatsapp") {
          window.open(`https://api.whatsapp.com/send?text=${fallbackMsg}`, "_blank");
        } else {
          window.location.href = `sms:?body=${fallbackMsg}`;
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Ask chatbot
  const askBot = async (text = question) => {
    if (!text.trim() || loading) return;

    const userQuestion = text.trim();

    const history = messages.map((message) => ({
      role: message.type === "user" ? "user" : "assistant",
      content: message.text,
    }));

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
        `${API_BASE_URL}/chat`,
        {
          question: userQuestion,
          history: history,
        }
      );

      console.log("Backend response:", response.data);

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
          text:
            "Sorry, I could not connect to the safety assistant. Please make sure the backend server is running.",
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

        {/* HEADER */}
        <header className="header">
          <div className="header-brand">
            <div className="shield">🛡️</div>
            <div>
              <h1>Women Safety & Support</h1>
              <p>Trusted information and support when you need it.</p>
            </div>
          </div>

          <button
            className="header-sos-button"
            onClick={() => setSosModalOpen(true)}
            aria-label="Activate Emergency SOS"
          >
            🚨 SOS
          </button>
        </header>


        {/* EMERGENCY SECTION */}
        <div className="emergency-card">

          <div className="emergency-icon">
            🚨
          </div>

          <div className="emergency-content">

            <h3>Need Immediate Help?</h3>

            <p>
              If you are in immediate danger, move to a safer
              location when possible and contact emergency services.
            </p>

            {/* Quick SOS Trigger Banner */}
            <button
              className="sos-banner-trigger"
              onClick={() => setSosModalOpen(true)}
            >
              <span className="sos-banner-icon">🚨</span>
              <span className="sos-banner-text">
                <strong>ACTIVATE SOS MODE</strong>
                <small>Instant Calls • Live GPS WhatsApp/SMS • Loud Alarm</small>
              </span>
              <span className="sos-banner-arrow">➔</span>
            </button>


            {/* Emergency numbers */}
            <div className="emergency-numbers">

              <div
                className="clickable-number"
                onClick={() => callEmergency("112")}
                title="Click to call 112"
              >
                <span>Emergency</span>
                <strong>112 📞</strong>
              </div>

              <div
                className="clickable-number"
                onClick={() => callEmergency("181")}
                title="Click to call 181"
              >
                <span>Women Helpline</span>
                <strong>181 📞</strong>
              </div>

            </div>


            {/* Emergency location buttons */}
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


            {/* Emergency call */}
            <button
              className="call-emergency-button"
              onClick={() => callEmergency("112")}
            >
              📞 Call Emergency Services — 112
            </button>

          </div>
        </div>


        {/* WELCOME SCREEN */}
        {messages.length === 0 && (
          <div className="welcome">

            <h2>How can I help you?</h2>

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


        {/* CLEAR CHAT */}
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


        {/* CONVERSATION HISTORY */}
        <div className="chat-section">

          <div className="chat-history-title">
            💬 Conversation History
          </div>


          <div className="chat-box">

            {messages.map((message, index) => (

              <div
                key={index}
                className={
                  message.type === "user"
                    ? "message user-message"
                    : "message assistant-message"
                }
              >

                {/* Message label */}
                <div className="message-label">

                  {message.type === "user"
                    ? "You"
                    : "🛡️ Safety Assistant"}

                </div>


                {/* Message content */}
                <div className="message-text">

                  {message.type === "assistant" ? (

                    <ReactMarkdown>
                      {cleanMarkdown(message.text)}
                    </ReactMarkdown>

                  ) : (

                    message.text

                  )}

                </div>


                {/* Time */}
                <div className="message-time">
                  {message.time}
                </div>


                {/* Sources */}
                {message.type === "assistant" &&
                  message.sources &&
                  message.sources.length > 0 && (

                    <div className="sources">

                      <strong>📚 Sources</strong>

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


            {/* Loading */}
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


        {/* INPUT AREA */}
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
              loading || !question.trim()
            }
          >
            {loading ? "..." : "Send"}
          </button>

        </div>


        {/* FOOTER */}
        <div className="privacy">

          <span>🔒 Privacy protected</span>

          <span>•</span>

          <span>
            📚 Answers are based on the knowledge base
          </span>

          <span>•</span>

          <span>
            🛡️ Safety Support Assistant
          </span>

        </div>

        {/* FLOATING SOS BUTTON */}
        <button
          className="floating-sos-btn"
          onClick={() => setSosModalOpen(true)}
          title="Emergency SOS Mode"
          aria-label="Emergency SOS Mode"
        >
          <span className="sos-pulse-ring"></span>
          <span className="sos-btn-content">🚨 SOS</span>
        </button>

        {/* EMERGENCY SOS MODAL */}
        {sosModalOpen && (
          <div className="sos-modal-overlay" onClick={closeSosModal}>
            <div
              className="sos-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sos-modal-header">
                <div className="sos-modal-title">
                  <span className="sos-badge-icon">🚨</span>
                  <div>
                    <h2>EMERGENCY SOS</h2>
                    <p>Immediate danger assistance & alerts</p>
                  </div>
                </div>
                <button
                  className="sos-modal-close"
                  onClick={closeSosModal}
                  aria-label="Close SOS Modal"
                >
                  ✕
                </button>
              </div>

              <div className="sos-modal-body">
                {/* Emergency Hotlines */}
                <div className="sos-action-group">
                  <div className="sos-group-label">Instant Emergency Call</div>
                  <div className="sos-call-grid">
                    <button
                      className="sos-action-btn call-112"
                      onClick={() => callEmergency("112")}
                    >
                      <span className="btn-icon">📞</span>
                      <div>
                        <strong>Call 112</strong>
                        <small>Police / National Emergency</small>
                      </div>
                    </button>

                    <button
                      className="sos-action-btn call-181"
                      onClick={() => callEmergency("181")}
                    >
                      <span className="btn-icon">📞</span>
                      <div>
                        <strong>Call 181</strong>
                        <small>Women Helpline (India)</small>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Send Live GPS Location */}
                <div className="sos-action-group">
                  <div className="sos-group-label">Broadcast Live GPS Location</div>
                  <div className="sos-share-grid">
                    <button
                      className="sos-action-btn whatsapp-share"
                      onClick={() => shareLocationSOS("whatsapp")}
                      disabled={sharingLocation}
                    >
                      <span className="btn-icon">💬</span>
                      <div>
                        <strong>{sharingLocation ? "Getting GPS..." : "Share on WhatsApp"}</strong>
                        <small>Send Google Maps pin & alert to contacts</small>
                      </div>
                    </button>

                    <button
                      className="sos-action-btn sms-share"
                      onClick={() => shareLocationSOS("sms")}
                      disabled={sharingLocation}
                    >
                      <span className="btn-icon">📱</span>
                      <div>
                        <strong>{sharingLocation ? "Getting GPS..." : "Send via SMS"}</strong>
                        <small>Open SMS with coordinates</small>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Audible Siren Alarm */}
                <div className="sos-action-group">
                  <div className="sos-group-label">Loud Siren (Scare Off Threats)</div>
                  <button
                    className={`sos-siren-btn ${sirenActive ? "siren-active" : ""}`}
                    onClick={toggleSiren}
                  >
                    <span className="siren-icon">{sirenActive ? "🔊" : "📢"}</span>
                    <div>
                      <strong>
                        {sirenActive ? "STOP LOUD SIREN ALARM" : "SOUND LOUD SIREN ALARM"}
                      </strong>
                      <small>
                        {sirenActive
                          ? "Siren is blasting at maximum volume! Click to stop."
                          : "Plays an attention-grabbing emergency alarm from speakers"}
                      </small>
                    </div>
                  </button>
                </div>

                {/* Find nearest police */}
                <div className="sos-action-group">
                  <div className="sos-group-label">Nearby Safety</div>
                  <button
                    className="sos-action-btn find-police"
                    onClick={() => {
                      closeSosModal();
                      findNearbyPlaces("police station");
                    }}
                  >
                    <span className="btn-icon">🚓</span>
                    <div>
                      <strong>Open Nearest Police Stations on Map</strong>
                      <small>Opens Google Maps with current location</small>
                    </div>
                  </button>
                </div>
              </div>

              <div className="sos-modal-footer">
                <button className="sos-close-btn" onClick={closeSosModal}>
                  I Am Safe / Close Window
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
