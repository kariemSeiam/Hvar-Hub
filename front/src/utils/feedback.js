/**
 * Feedback Utilities for Mobile QR Scanner
 * Provides haptic, audio, and visual feedback for better UX
 */

// Create audio context for sound feedback
let audioContext = null;

const initAudioContext = () => {
  if (!audioContext && (window.AudioContext || window.webkitAudioContext)) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
};

/**
 * Haptic feedback for mobile devices
 * @param {string} type - Type of haptic feedback ('success', 'warning', 'error', 'light')
 */
export const hapticFeedback = (type = 'success') => {
  if (!navigator.vibrate) return;

  const patterns = {
    success: [200], // Single vibration for success
    warning: [100, 50, 100], // Double pulse for warning
    error: [300, 100, 300, 100, 300], // Strong pattern for error
    light: [50], // Light tap
    scan: [100], // Quick feedback for scanning
  };

  navigator.vibrate(patterns[type] || patterns.success);
};

/**
 * Audio feedback using Web Audio API
 * @param {string} type - Type of sound ('beep', 'success', 'error')
 */
export const audioFeedback = (type = 'beep') => {
  const ctx = initAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  const frequencies = {
    beep: 800,
    success: 1000,
    error: 300,
    scan: 600
  };

  const durations = {
    beep: 0.1,
    success: 0.2,
    error: 0.3,
    scan: 0.05
  };

  oscillator.frequency.setValueAtTime(frequencies[type] || frequencies.beep, ctx.currentTime);
  oscillator.type = 'sine';

  gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (durations[type] || durations.beep));

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + (durations[type] || durations.beep));
};

/**
 * Visual feedback with flash animation
 * @param {string} color - Color of the flash ('green', 'red', 'blue', 'white')
 */
export const visualFeedback = (color = 'green') => {
  const colors = {
    green: '#10B981',
    red: '#EF4444',
    blue: '#3B82F6',
    white: '#FFFFFF',
    yellow: '#F59E0B'
  };

  // Create flash overlay
  const flash = document.createElement('div');
  flash.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: ${colors[color] || colors.green};
    opacity: 0;
    pointer-events: none;
    z-index: 9999;
    transition: opacity 0.1s ease-in-out;
  `;

  document.body.appendChild(flash);

  // Trigger flash animation
  requestAnimationFrame(() => {
    flash.style.opacity = '0.3';
    setTimeout(() => {
      flash.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(flash);
      }, 100);
    }, 100);
  });
};

/**
 * Combined feedback for QR scan success
 */
export const scanSuccessFeedback = () => {
  hapticFeedback('success');
  audioFeedback('success');
  visualFeedback('green');
};

/**
 * Combined feedback for QR scan error
 */
export const scanErrorFeedback = () => {
  hapticFeedback('error');
  audioFeedback('error');
  visualFeedback('red');
};

/**
 * Light feedback for scanning process
 */
export const scanProcessFeedback = () => {
  hapticFeedback('light');
  audioFeedback('scan');
};

/**
 * Check if device supports haptic feedback
 */
export const hasHapticSupport = () => {
  return !!navigator.vibrate;
};

/**
 * Check if device supports audio feedback
 */
export const hasAudioSupport = () => {
  return !!(window.AudioContext || window.webkitAudioContext);
};

/**
 * Request permission for notifications (for future use)
 */
export const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    return await Notification.requestPermission();
  }
  return 'denied';
};

export default {
  hapticFeedback,
  audioFeedback,
  visualFeedback,
  scanSuccessFeedback,
  scanErrorFeedback,
  scanProcessFeedback,
  hasHapticSupport,
  hasAudioSupport,
  requestNotificationPermission
}; 