import TemplateFrame from './TemplateFrame';

export default function Pastel( props ) {
	return (
		<TemplateFrame slug="pastel" { ...props }>
			{ props.children }
		</TemplateFrame>
	);
}
