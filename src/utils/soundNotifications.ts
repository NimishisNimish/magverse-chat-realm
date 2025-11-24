// Sound notification utility for AI processing stages

export type SoundType = 'analyzing' | 'thinking' | 'generating' | 'complete' | 'error' | 'queueAdd' | 'urgentQueue';

// Base64 encoded sounds (small, optimized audio files)
export const sounds: Record<SoundType, string> = {
  // Soft click for analyzing stage
  analyzing: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFgH98eXJsZmBZU01HQTs1MB4mKy8zNzs+QUM+OzgzLykjHBYQCgQA9/Px7Onl4d3Z1dHOysrKyszP0tXY3OHl6e3x9fkA',
  
  // Gentle beep for thinking stage
  thinking: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAAB5eXp6e3t8fH19fn5/f4CAgYGCgoKDg4SEhIWFhoaHh4eIiImJiYqKiouLi4uMjIyMjY2Njo6Oj46Pj5CQkJGRkZGSkpKTk5OUlJSVlZWVlpaWl5eXmJiYmZmZmpqam5ubnJycnZ2dnp6en5+foKCgoaGhoqKio6OjpKSkpaWlpqamp6enqKioqampqqqqq6urrKysra2trq6ur6+vsLCwsbGxsrKys7Ozs7S0tLW1tba2tre3t7i4uLm5ubq6uru7u7y8vL29vb6+vr+/v8DAwMHBwcLCwsPDw8TExMXFxcbGxsfHx8jIyMnJycrKysvLy8zMzM3Nzc7Ozs/Pz9DQ0NHR0dLS0tPT09TU1NXV1dbW1tfX19jY2NnZ2dra2tvb29zc3N3d3d7e3t/f3+Dg4OHh4eLi4uPj4+Tk5OXl5ebm5ufn5+jo6Onp6erq6uvr6+zs7O3t7e7u7u/v7/Dw8PHx8fLy8vPz8/T09PX19fb29vf39/j4+Pn5+fr6+vv7+/z8/P39/f7+/v///wA=',
  
  // Light tick for generating stage
  generating: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAgYGCgoODhISFhYaGh4eIiImJioqLi4yMjY2Ojo+PkJCRkZKSk5OUlJWVlpaXl5iYmZmampubmpqZmZiYl5eWlpWVlJSUk5OSkpGRkJCPj46Ojo2NjIyLi4qKiYmIiIeHhoaFhYSEg4OCgoGBgICAgIGBgoKDg4SEhYWGhoeHiIiJiYqKi4uMjI2Njo6Pj5CQkZGSkpOTlJSVlZaWl5eYmJmZmpqbm5qamZmYmJeXlpaVlZSUk5OSkpGRkJCPj46Ojo2NjIyLi4qKiYmIiIeHhoaFhYSEg4OCgoGBgA==',
  
  // Pleasant ding for completion
  complete: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAgoSGiIqMjpCSlJaYmpyeoKKkpqiqrK6wsr6+vry6uLa0srCurKqop6alo6GfnZuZl5WTkY+NjIqIhoSCgICCg4WGh4iKi4yOj5GTlJWXmJqbnJ6foKKjpKWnqKmqrK2ur7Cxs7S1tre5uru8vr+/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/wA=',
  
  // Soft alert for error
  error: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAAB/fn18e3p5eHd2dXRzcnFwb25tbWxrbGttbm9wcXJzdHV2d3h5ent8fX5/f3+AgYGCgoODg4SEhISFhYWFhoaGhoaHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eGhoaGhoWFhYWEhISEg4ODgoKBgYCAgH9/fn59fHt6eXh3dnVzcnFwb25ta2xsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoODhIWFhoaHiIiJiYqKi4uMjI2Njo6Oj4+QkJGRkZKSkpOTk5OUlJSUlJSUlJSUlJOTk5KSkpGRkJCPj46Ojo2MjIuLioqJiYiIh4aGhYWEg4OCgYCAfwA=',
  
  // Pop sound for queue add
  queueAdd: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAhImNkZWZnKCkqKyws7e7v8PHy8/T19vf4+fr7/P3+/8D',
  
  // Attention sound for urgent queue
  urgentQueue: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAhIiNkZWZnKCkqKyws7e7v8PHy8/T19vf4+fr7/P3+/8DBAgMEBQYHCAkKCwwNDg8QERFSU1RVVldaW11hYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ent8fX5/gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8A'
};

// Play a sound notification
export const playSound = (soundType: SoundType, volume: number = 0.3): void => {
  try {
    const audio = new Audio(sounds[soundType]);
    audio.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
    audio.play().catch(err => {
      console.warn('Could not play sound:', err);
    });
  } catch (error) {
    console.warn('Error creating audio:', error);
  }
};

// Check if sound is supported
export const isSoundSupported = (): boolean => {
  return typeof Audio !== 'undefined';
};

// Get sound preference from localStorage
export const getSoundPreference = (): boolean => {
  try {
    const preference = localStorage.getItem('soundNotificationsEnabled');
    return preference === null ? true : preference === 'true'; // Default to enabled
  } catch {
    return true;
  }
};

// Save sound preference to localStorage
export const setSoundPreference = (enabled: boolean): void => {
  try {
    localStorage.setItem('soundNotificationsEnabled', String(enabled));
  } catch (error) {
    console.warn('Could not save sound preference:', error);
  }
};
