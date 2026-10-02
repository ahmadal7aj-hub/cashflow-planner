import { fireEvent, render, screen } from '@testing-library/react-native';

import { DateField, DatePicker } from './dates';

const TODAY = '2026-10-03';

describe('DatePicker', () => {
  it('opens on the month of today and starts the week on Monday', async () => {
    await render(<DatePicker value={null} today={TODAY} onChange={() => undefined} />);

    expect(screen.getByText('October 2026')).toBeTruthy();
    const labels = screen
      .getAllByText(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/)
      .map((n) => n.props.children);
    expect(labels).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  });

  it('shows every day of the month and no more', async () => {
    await render(<DatePicker value={null} today={TODAY} onChange={() => undefined} />);

    expect(screen.getByTestId('date-day-2026-10-01')).toBeTruthy();
    expect(screen.getByTestId('date-day-2026-10-31')).toBeTruthy();
    expect(screen.queryByTestId('date-day-2026-10-32')).toBeNull();
  });

  it('chooses a day', async () => {
    const onChange = jest.fn();
    await render(<DatePicker value={null} today={TODAY} onChange={onChange} />);

    await fireEvent.press(screen.getByTestId('date-day-2026-10-20'));
    expect(onChange).toHaveBeenCalledWith('2026-10-20');
  });

  it('moves between months, including across a year end', async () => {
    await render(<DatePicker value="2026-12-15" today={TODAY} onChange={() => undefined} />);

    expect(screen.getByText('December 2026')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('date-next'));
    expect(screen.getByText('January 2027')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('date-prev'));
    await fireEvent.press(screen.getByTestId('date-prev'));
    expect(screen.getByText('November 2026')).toBeTruthy();
  });

  it('knows February has 29 days in a leap year', async () => {
    await render(<DatePicker value="2028-02-10" today={TODAY} onChange={() => undefined} />);
    expect(screen.getByTestId('date-day-2028-02-29')).toBeTruthy();
    expect(screen.queryByTestId('date-day-2028-02-30')).toBeNull();
  });

  it('knows February has 28 days in a normal year', async () => {
    await render(<DatePicker value="2027-02-10" today={TODAY} onChange={() => undefined} />);
    expect(screen.getByTestId('date-day-2027-02-28')).toBeTruthy();
    expect(screen.queryByTestId('date-day-2027-02-29')).toBeNull();
  });

  it('does not allow days before the minimum or after the maximum', async () => {
    const onChange = jest.fn();
    await render(
      <DatePicker
        value={null}
        today={TODAY}
        onChange={onChange}
        minDate={TODAY}
        maxDate="2026-10-20"
      />,
    );

    await fireEvent.press(screen.getByTestId('date-day-2026-10-02')); // before min
    await fireEvent.press(screen.getByTestId('date-day-2026-10-21')); // after max
    expect(onChange).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('date-day-2026-10-03')); // the minimum itself
    await fireEvent.press(screen.getByTestId('date-day-2026-10-20')); // the maximum itself
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('describes each day for screen readers, marks today and the selected day', async () => {
    await render(<DatePicker value="2026-10-15" today={TODAY} onChange={() => undefined} />);

    expect(screen.getByLabelText('3 Oct 2026, today')).toBeTruthy();
    const selected = screen.getByLabelText('15 Oct 2026');
    expect(selected.props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByLabelText('16 Oct 2026').props.accessibilityState).toMatchObject({
      selected: false,
    });
  });
});

describe('DateField', () => {
  it('asks the user to choose when empty, then shows the date and how far away it is', async () => {
    const onChange = jest.fn();
    const { rerender } = await render(
      <DateField label="Due date" value={null} today={TODAY} onChange={onChange} testID="due" />,
    );
    expect(screen.getByText('Choose a date')).toBeTruthy();

    await rerender(
      <DateField
        label="Due date"
        value="2026-12-15"
        today={TODAY}
        onChange={onChange}
        testID="due"
      />,
    );
    expect(screen.getByText('15 Dec 2026 · in 73 days')).toBeTruthy();
  });

  it('opens the calendar when tapped and closes it after a day is chosen', async () => {
    const onChange = jest.fn();
    await render(
      <DateField label="Due date" value={null} today={TODAY} onChange={onChange} testID="due" />,
    );
    expect(screen.queryByTestId('due-picker')).toBeNull();

    await fireEvent.press(screen.getByTestId('due-toggle'));
    expect(screen.getByTestId('due-picker')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('date-day-2026-10-09'));
    expect(onChange).toHaveBeenCalledWith('2026-10-09');
    expect(screen.queryByTestId('due-picker')).toBeNull();
  });

  it('offers a clear button only for optional dates that have a value', async () => {
    const onClear = jest.fn();
    const { rerender } = await render(
      <DateField
        label="Deadline"
        value={null}
        today={TODAY}
        onChange={() => undefined}
        onClear={onClear}
        testID="dl"
      />,
    );
    expect(screen.queryByTestId('dl-clear')).toBeNull();

    await rerender(
      <DateField
        label="Deadline"
        value="2026-12-15"
        today={TODAY}
        onChange={() => undefined}
        onClear={onClear}
        testID="dl"
      />,
    );
    await fireEvent.press(screen.getByTestId('dl-clear'));
    expect(onClear).toHaveBeenCalled();
  });

  it('shows an accessible error message', async () => {
    await render(
      <DateField
        label="Due date"
        value={null}
        today={TODAY}
        onChange={() => undefined}
        error="Please choose a due date."
        testID="due"
      />,
    );
    expect(screen.getByTestId('error-due')).toBeTruthy();
  });
});
