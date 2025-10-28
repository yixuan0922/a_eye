import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const sliderVariants = cva(
  "relative flex w-full touch-none select-none items-center",
  {
    variants: {
      size: {
        default: "h-5",
        sm: "h-4",
        lg: "h-6",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

const trackVariants = cva(
  "relative h-2 w-full grow overflow-hidden rounded-full bg-slate-100",
  {
    variants: {
      variant: {
        default: "bg-slate-100",
        blue: "bg-blue-50",
        green: "bg-green-50",
        red: "bg-red-50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const rangeVariants = cva(
  "absolute h-full",
  {
    variants: {
      variant: {
        default: "bg-slate-900",
        blue: "bg-blue-600",
        green: "bg-green-600",
        red: "bg-red-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const thumbVariants = cva(
  "block h-5 w-5 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-slate-900 bg-white shadow hover:bg-slate-100 focus-visible:ring-slate-400",
        blue: "border-blue-600 bg-white shadow hover:bg-blue-50 focus-visible:ring-blue-400",
        green: "border-green-600 bg-white shadow hover:bg-green-50 focus-visible:ring-green-400",
        red: "border-red-600 bg-white shadow hover:bg-red-50 focus-visible:ring-red-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
    VariantProps<typeof sliderVariants>,
    VariantProps<typeof trackVariants> {
  onValueCommit?: (value: number[]) => void;
  valueDisplay?: React.ReactNode;
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, size, variant, onValueCommit, valueDisplay, ...props }, ref) => (
  <div className="flex items-center gap-3">
    <SliderPrimitive.Root
      ref={ref}
      className={cn(sliderVariants({ size }), className)}
      onValueCommit={
        onValueCommit
          ? (value) => {
              onValueCommit(value);
            }
          : undefined
      }
      {...props}
    >
      <SliderPrimitive.Track className={cn(trackVariants({ variant }))}>
        <SliderPrimitive.Range className={cn(rangeVariants({ variant }))} />
      </SliderPrimitive.Track>
      {props.value?.map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          className={cn(thumbVariants({ variant }))}
          aria-label={`Thumb ${i + 1}`}
        />
      ))}
    </SliderPrimitive.Root>
    {valueDisplay}
  </div>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };