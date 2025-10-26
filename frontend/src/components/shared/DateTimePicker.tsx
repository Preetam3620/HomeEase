import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface DateTimePickerProps {
  startDate: Date;
  endDate: Date;
  onStartChange: (date: Date) => void;
  onEndChange: (date: Date) => void;
}

const DateTimePicker = ({ startDate, endDate, onStartChange, onEndChange }: DateTimePickerProps) => {
  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="startTime">Start Time</Label>
        <Input
          id="startTime"
          type="datetime-local"
          value={formatDateTimeLocal(startDate)}
          onChange={(e) => onStartChange(new Date(e.target.value))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="endTime">End Time</Label>
        <Input
          id="endTime"
          type="datetime-local"
          value={formatDateTimeLocal(endDate)}
          onChange={(e) => onEndChange(new Date(e.target.value))}
        />
      </div>
    </div>
  );
};

export default DateTimePicker;
