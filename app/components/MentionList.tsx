import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Plus } from "lucide-react";

interface MentionListProps {
  items: string[];
  command: (item: { id: string }) => void;
  query?: string;
}

export const MentionList = forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent }) => boolean },
  MentionListProps
>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const hasItems = props.items.length > 0;
  const canCreateNew = !hasItems && props.query && props.query.trim() !== "";
  const totalItems = hasItems ? props.items.length : canCreateNew ? 1 : 0;

  const selectItem = (index: number) => {
    if (hasItems) {
      const item = props.items[index];
      if (item) {
        props.command({ id: item });
      }
    } else if (canCreateNew) {
      // Create new tag with the query text
      props.command({ id: props.query! });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + totalItems - 1) % totalItems);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % totalItems);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }

      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }

      if (event.key === "Enter") {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  return (
    <div className="bg-white border gap-[0.1rem] border-stone-900/5 rounded-[0.7rem] shadow-[0_12px_33px_0_rgba(0,0,0,0.06),0_3.618px_9.949px_0_rgba(0,0,0,0.04)] flex flex-col overflow-auto p-[0.4rem] relative">
      {hasItems ? (
        props.items.map((item, index) => (
          <button
            className={`flex items-center gap-1 text-left w-full px-[10px] py-[6px] leading-[1.15] text-sm rounded-[8px] capitalize ${
              index === selectedIndex
                ? "bg-[rgba(61,37,20,0.08)]"
                : "hover:bg-[rgba(61,37,20,0.08)]"
            }`}
            key={index}
            onClick={() => selectItem(index)}
          >
            {item}
          </button>
        ))
      ) : canCreateNew ? (
        <button
          className={`flex items-center gap-1.5 text-left w-full pl-[10px] py-[6px] pr-[12px] leading-[1.15] text-sm rounded-[8px] capitalize text-blue-600 ${
            selectedIndex === 0
              ? "bg-[rgba(61,37,20,0.08)]"
              : "hover:bg-[rgba(61,37,20,0.08)]"
          }`}
          onClick={() => selectItem(0)}
        >
          <Plus size={14} className="shrink-0" />
          <span>{props.query}</span>
        </button>
      ) : (
        <div className="px-[10px] py-[6px] leading-[1.15] text-sm text-gray-500">
          No tags
        </div>
      )}
    </div>
  );
});
