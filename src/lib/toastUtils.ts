import { toast as sonnerToast } from "sonner";

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
}

const getToastPosition = (type: ToastType) => {
  switch (type) {
    case 'success':
      return 'top-right';
    case 'error':
      return 'top-center';
    case 'warning':
      return 'bottom-right';
    case 'info':
    default:
      return 'bottom-center';
  }
};

const getToastAnimation = (type: ToastType) => {
  switch (type) {
    case 'success':
      return 'toast-slide-in-right';
    case 'error':
      return 'toast-slide-in-top';
    case 'warning':
      return 'toast-slide-in-bottom';
    case 'info':
    default:
      return 'toast-slide-in-bottom';
  }
};

export const showToast = ({ title, description, type = 'info', duration = 4000 }: ToastOptions) => {
  const position = getToastPosition(type);
  const animation = getToastAnimation(type);

  const toastConfig: any = {
    description,
    duration,
    position,
    className: animation,
  };

  switch (type) {
    case 'success':
      sonnerToast.success(title, toastConfig);
      break;
    case 'error':
      sonnerToast.error(title, toastConfig);
      break;
    case 'warning':
      sonnerToast.warning(title, toastConfig);
      break;
    case 'info':
    default:
      sonnerToast.info(title, toastConfig);
      break;
  }
};
