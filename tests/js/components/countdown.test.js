import { act, render, screen } from '@testing-library/react';
import Countdown from '../../../src/components/Countdown';

it( 'uses the server clock when the device clock is ahead', () => {
	jest.useFakeTimers().setSystemTime( new Date( '2026-01-01T02:00:00Z' ) );
	try {
		render(
			<Countdown
				endsAt="2026-01-01T01:00:00Z"
				clockOffset={ -2 * 60 * 60 * 1000 }
			/>
		);
		expect( screen.getByRole( 'timer' ).textContent ).toContain(
			'01h00m00s'
		);
		act( () => jest.advanceTimersByTime( 1000 ) );
		expect( screen.getByRole( 'timer' ).textContent ).toContain(
			'00h59m59s'
		);
	} finally {
		jest.useRealTimers();
	}
} );
