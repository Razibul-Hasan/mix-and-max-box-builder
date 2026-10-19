import { createContext, useContext, useMemo } from '@wordpress/element';
import { createMoneyFormatter } from '../utils/money';

const MoneyContext = createContext( createMoneyFormatter() );

// Settings are registered in PHP and can be overridden for previews.
export function MoneyProvider( {
	settings = window.mmbbMoneySettings,
	children,
} ) {
	const formatter = useMemo(
		() => createMoneyFormatter( settings ),
		[ settings ]
	);
	return (
		<MoneyContext.Provider value={ formatter }>
			{ children }
		</MoneyContext.Provider>
	);
}

export function useMoney() {
	return useContext( MoneyContext );
}
